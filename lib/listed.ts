import "server-only";

import { unstable_cache, revalidateTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import { hostname } from "@/lib/utils";
import { categories, siteConfig } from "@/lib/config";
import type { ListedSite } from "@/lib/supabase/types";

/**
 * The open "$0 listing" tier. Anyone can list a project without connecting
 * Search Console; listings live in their own table and on their own /listed
 * board, kept off the verified momentum leaderboard. Listing is free but
 * requires the RealRank badge on the site, so listings are owner-verified at
 * creation (indexed, dofollow) — there is no unverified placeholder tier.
 * Connecting Search Console is the next rung: it promotes the site into
 * published_sites. All writes go through this module with the service role;
 * the table has no open insert policy.
 */

export const LISTED_TAG = "listed-sites";

/** Public-facing listing row (no internal ids/PII leaked to the UI). */
export interface Listing {
  host: string;
  siteUrl: string;
  displayName: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  /** The established tool this project is a free/indie alternative to, if declared. */
  alternativeTo: string | null;
  ownerVerified: boolean;
  createdAt: string;
}

function toListing(row: ListedSite): Listing {
  return {
    host: row.host,
    siteUrl: row.site_url,
    displayName: row.display_name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    alternativeTo: row.alternative_to,
    ownerVerified: row.owner_verified,
    createdAt: row.created_at,
  };
}

const MAX = { name: 80, tagline: 120, description: 300, alternativeTo: 60 } as const;
const VALID_CATEGORIES = new Set<string>(categories.map((c) => c.slug));

/**
 * Normalize arbitrary user input (a URL or a bare domain) to a registrable
 * host: lowercased, no scheme, no `www.`, no path. Returns null when the input
 * isn't a plausible public web host (needs a dot, no spaces, valid label chars).
 */
export function normalizeHost(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  let host: string;
  try {
    host = new URL(withScheme).hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, "");
  // A public host has at least one dot and only valid label characters.
  if (!host.includes(".")) return null;
  if (!/^[a-z0-9.-]+$/.test(host)) return null;
  if (host.length > 253) return null;
  // Reject obvious localhost / IPs — not listable public projects.
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  return host;
}

/** Canonical https URL for a listed host. */
export function listingUrl(host: string): string {
  return `https://${host}`;
}

export interface CreateListingInput {
  url: string;
  displayName: string;
  tagline?: string;
  description?: string;
  category?: string;
  alternativeTo?: string;
  email?: string;
}

export type CreateListingResult =
  | { ok: true; host: string; ownerVerified: true }
  | {
      ok: false;
      error: string;
      code: "invalid" | "duplicate" | "rate_limited" | "unavailable" | "server" | "badge_missing" | "unreachable";
    };

const BADGE_FETCH_TIMEOUT_MS = 8000;
const BADGE_MAX_BYTES = 512 * 1024;

/**
 * Fetch a host's homepage and report whether it carries a RealRank badge/link
 * (any mention of our domain). Bounded fetch (timeout + size cap) so a hostile
 * page can't hang or balloon memory. Shared by createListing (the list-time
 * requirement) and verifyOwnership (re-check of an existing listing).
 */
async function siteCarriesMarker(
  host: string,
): Promise<{ ok: true; found: boolean } | { ok: false; error: string }> {
  const marker = new URL(siteConfig.url).hostname.replace(/^www\./, ""); // e.g. realrank.lol
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BADGE_FETCH_TIMEOUT_MS);
    const res = await fetch(listingUrl(host), {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": `${siteConfig.name}Bot/1.0 (+${siteConfig.url})` },
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) return { ok: false, error: `Couldn't reach ${host} (HTTP ${res.status}).` };
    const buf = await res.arrayBuffer();
    const html = new TextDecoder().decode(buf.slice(0, BADGE_MAX_BYTES)).toLowerCase();
    return { ok: true, found: html.includes(marker) };
  } catch {
    return { ok: false, error: `Couldn't reach ${host} to check for the badge.` };
  }
}

/**
 * Create a listing. Listing is free but REQUIRES the RealRank badge on the
 * site: the free tier is a reciprocal link in exchange for the listing, so the
 * badge is checked up front and the listing is created owner-verified — there
 * is no unverified placeholder tier any more. Server-side validation + spam
 * guards (the API route adds a honeypot on top): host must be a real public
 * domain, text within limits, a known category, not already listed or ranked,
 * and the site must carry the badge. A coarse per-IP hourly cap blunts floods.
 */
export async function createListing(
  input: CreateListingInput,
  ip: string | null,
): Promise<CreateListingResult> {
  const host = normalizeHost(input.url);
  if (!host) return { ok: false, error: "Enter a valid website URL.", code: "invalid" };

  const displayName = input.displayName.trim().slice(0, MAX.name);
  if (displayName.length < 2) return { ok: false, error: "Add a project name.", code: "invalid" };

  const tagline = input.tagline?.trim().slice(0, MAX.tagline) || null;
  const description = input.description?.trim().slice(0, MAX.description) || null;
  const category = input.category && VALID_CATEGORIES.has(input.category) ? input.category : null;
  const alternativeTo = input.alternativeTo?.trim().slice(0, MAX.alternativeTo) || null;
  const email = input.email?.trim().slice(0, 200) || null;

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Listings aren't available in this environment yet.", code: "unavailable" };
  }

  try {
    const supabase = createServiceClient();

    // Already a verified site on the ranked board? Point them there instead of
    // creating a shadow listing.
    const { data: published } = await supabase
      .from("published_sites")
      .select("site_url")
      .eq("is_active", true);
    const alreadyRanked = (published ?? []).some(
      (p) => hostname(p.site_url).toLowerCase() === host,
    );
    if (alreadyRanked) {
      return { ok: false, error: "That site is already on the verified board.", code: "duplicate" };
    }

    // Already listed?
    const { data: existing } = await supabase
      .from("listed_sites")
      .select("id")
      .eq("host", host)
      .maybeSingle();
    if (existing) {
      return { ok: false, error: "That site is already listed.", code: "duplicate" };
    }

    // Coarse per-IP hourly cap (best-effort; ip may be null behind some proxies).
    if (ip) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("listed_sites")
        .select("id", { count: "exact", head: true })
        .eq("submitted_ip", ip)
        .gte("created_at", hourAgo);
      if ((count ?? 0) >= 5) {
        return { ok: false, error: "You've listed a lot in a short time. Try again later.", code: "rate_limited" };
      }
    }

    // The badge is the price of a free listing: the site must carry a RealRank
    // badge/link before we'll list it. Verify up front and list as
    // owner-verified — no unverified placeholder rows.
    const marker = await siteCarriesMarker(host);
    if (!marker.ok) {
      return { ok: false, error: marker.error, code: "unreachable" };
    }
    if (!marker.found) {
      return {
        ok: false,
        code: "badge_missing",
        error: `Add the ${siteConfig.name} badge to ${host}, then list — it's free in exchange for a link back.`,
      };
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabase.from("listed_sites").insert({
      host,
      site_url: listingUrl(host),
      display_name: displayName,
      tagline,
      description,
      category,
      alternative_to: alternativeTo,
      submitter_email: email,
      submitted_ip: ip,
      status: "owner_verified",
      owner_verified: true,
      verified_at: nowIso,
    });
    if (error) {
      // Unique-violation race → treat as duplicate.
      if ((error as { code?: string }).code === "23505") {
        return { ok: false, error: "That site is already listed.", code: "duplicate" };
      }
      throw error;
    }

    revalidateTag(LISTED_TAG);
    return { ok: true, host, ownerVerified: true };
  } catch (err) {
    console.error("[listed] create failed:", err);
    return { ok: false, error: "Couldn't save the listing. Please try again.", code: "server" };
  }
}

/** Active listings, newest first (verified pinned above unverified). */
export const getListedSites = unstable_cache(
  async (): Promise<Listing[]> => {
    if (!isSupabaseConfigured()) return [];
    try {
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("listed_sites")
        .select("*")
        .eq("is_active", true)
        .order("owner_verified", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toListing);
    } catch (err) {
      console.error("[listed] read failed:", err);
      return [];
    }
  },
  ["listed-sites-v1"],
  { revalidate: 300, tags: [LISTED_TAG] },
);

/** One active listing by host, or null. */
export async function getListingByHost(host: string): Promise<Listing | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("listed_sites")
      .select("*")
      .eq("host", host)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return data ? toListing(data) : null;
  } catch (err) {
    console.error("[listed] read one failed:", err);
    return null;
  }
}

/** Host slugs for static params / sitemap. */
export async function getListedHosts(): Promise<string[]> {
  const sites = await getListedSites();
  return sites.map((s) => s.host);
}

/** Slugify a tool name for /alternatives-to/<slug> grouping. */
export function altToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A tool that one or more listed projects declare themselves an alternative to. */
export interface AlternativeTarget {
  slug: string;
  name: string;
  count: number;
}

/**
 * Distinct "alternative to" targets across active listings, most-listed first.
 * Derived from the cached getListedSites() read (the directory is small), so no
 * extra query. Powers the /alternatives-to index + static params.
 */
export async function getAlternativeTargets(): Promise<AlternativeTarget[]> {
  const sites = await getListedSites();
  const map = new Map<string, { name: string; count: number }>();
  for (const s of sites) {
    if (!s.alternativeTo) continue;
    const slug = altToSlug(s.alternativeTo);
    if (!slug) continue;
    const cur = map.get(slug);
    if (cur) cur.count += 1;
    else map.set(slug, { name: s.alternativeTo.trim(), count: 1 });
  }
  return Array.from(map.entries())
    .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Listings that declare themselves an alternative to the given target slug. */
export async function getListingsForAlternative(
  slug: string,
): Promise<{ name: string; listings: Listing[] } | null> {
  const sites = await getListedSites();
  const matches = sites.filter((s) => s.alternativeTo && altToSlug(s.alternativeTo) === slug);
  if (matches.length === 0) return null;
  return { name: matches[0].alternativeTo!.trim(), listings: matches };
}

export type VerifyResult =
  | { ok: true; verified: true }
  | { ok: false; verified: false; error: string };

/**
 * Prove ownership by fetching the listed site and checking for a RealRank
 * badge/link (a link back to realrank.lol). This is the reciprocal-badge
 * verification directories use: only someone who controls the site can add the
 * embed, so finding it lets us flip the listing to owner_verified (dofollow).
 * Fetch is bounded (timeout, redirect + size caps) so a hostile page can't hang
 * or balloon the request.
 */
export async function verifyOwnership(host: string): Promise<VerifyResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, verified: false, error: "Verification isn't available in this environment yet." };
  }

  const listing = await getListingByHost(host);
  if (!listing) return { ok: false, verified: false, error: "That listing doesn't exist." };
  if (listing.ownerVerified) return { ok: true, verified: true };

  const check = await siteCarriesMarker(host);
  if (!check.ok) return { ok: false, verified: false, error: check.error };
  if (!check.found) {
    return {
      ok: false,
      verified: false,
      error: `We couldn't find a ${siteConfig.name} badge or link on ${host}. Add the embed, then try again.`,
    };
  }

  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("listed_sites")
      .update({ owner_verified: true, status: "owner_verified", verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("host", host);
    if (error) throw error;
    revalidateTag(LISTED_TAG);
    return { ok: true, verified: true };
  } catch (err) {
    console.error("[listed] verify update failed:", err);
    return { ok: false, verified: false, error: "Found the badge, but couldn't save it. Please try again." };
  }
}
