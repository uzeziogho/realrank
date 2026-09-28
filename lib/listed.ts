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
 * board, kept off the verified momentum leaderboard. A listing is unverified
 * (noindex/nofollow) until ownership is proven — either by embedding the
 * RealRank badge/link on the site (owner_verified) or by connecting Search
 * Console (which promotes the site into published_sites). All writes go through
 * this module with the service role; the table has no open insert policy.
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
    ownerVerified: row.owner_verified,
    createdAt: row.created_at,
  };
}

const MAX = { name: 80, tagline: 120, description: 300 } as const;
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
  email?: string;
}

export type CreateListingResult =
  | { ok: true; host: string; ownerVerified: false }
  | { ok: false; error: string; code: "invalid" | "duplicate" | "rate_limited" | "unavailable" | "server" };

/**
 * Create a listing. Server-side validation + spam guards (the API route adds a
 * honeypot on top): host must be a real public domain, text within limits, a
 * known category, and the host must not already be listed OR already verified
 * on the ranked board. A coarse per-IP hourly cap blunts scripted floods.
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

    const { error } = await supabase.from("listed_sites").insert({
      host,
      site_url: listingUrl(host),
      display_name: displayName,
      tagline,
      description,
      category,
      submitter_email: email,
      submitted_ip: ip,
      status: "listed",
    });
    if (error) {
      // Unique-violation race → treat as duplicate.
      if ((error as { code?: string }).code === "23505") {
        return { ok: false, error: "That site is already listed.", code: "duplicate" };
      }
      throw error;
    }

    revalidateTag(LISTED_TAG);
    return { ok: true, host, ownerVerified: false };
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

  const marker = new URL(siteConfig.url).hostname.replace(/^www\./, ""); // e.g. realrank.lol
  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(listingUrl(host), {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": `${siteConfig.name}Bot/1.0 (+${siteConfig.url})` },
    }).finally(() => clearTimeout(timeout));
    if (!res.ok) {
      return { ok: false, verified: false, error: `Couldn't reach the site (HTTP ${res.status}).` };
    }
    // Cap the body we read so a huge/hostile page can't blow up memory (~512KB).
    const buf = await res.arrayBuffer();
    html = new TextDecoder().decode(buf.slice(0, 512 * 1024)).toLowerCase();
  } catch {
    return { ok: false, verified: false, error: "Couldn't reach the site to check for the badge." };
  }

  if (!html.includes(marker)) {
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
