import "server-only";

import { randomUUID } from "node:crypto";
import { unstable_cache, revalidateTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import { hostname } from "@/lib/utils";
import { categories, siteConfig, PRICING_OPTIONS, PLATFORM_OPTIONS } from "@/lib/config";
import { enrichListing } from "@/lib/listing-enrich";
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
  /** Structured profile fields (see PRICING_OPTIONS / PLATFORM_OPTIONS). */
  pricing: string | null;
  platforms: string[];
  details: string | null;
  ownerVerified: boolean;
  createdAt: string;
  /** Paid Spotlight window (labelled sponsored placement; never affects rank). */
  spotlightStartedAt: string | null;
  spotlightUntil: string | null;
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
    // Fields added by a later migration — tolerate their absence (?? ) so the
    // directory keeps working on a DB where the migration hasn't run yet.
    pricing: row.pricing ?? null,
    platforms: row.platforms ?? [],
    details: row.details ?? null,
    ownerVerified: row.owner_verified,
    createdAt: row.created_at,
    spotlightStartedAt: row.spotlight_started_at ?? null,
    spotlightUntil: row.spotlight_until ?? null,
  };
}

const MAX = { name: 80, tagline: 120, description: 400, alternativeTo: 60, details: 1000 } as const;
/** A listing must describe itself — what it does, who it's for, a differentiator. */
const DESC_MIN = 100;
/** Reject a submission only when the AI is at least this sure it isn't legit. */
const LEGIT_REJECT_CONFIDENCE = 0.8;
const VALID_CATEGORIES = new Set<string>(categories.map((c) => c.slug));

// Structured-field vocabularies live in lib/config (client-safe); here we only
// need the validation sets.
const VALID_PRICING = new Set<string>(PRICING_OPTIONS);
const VALID_PLATFORMS = new Set<string>(PLATFORM_OPTIONS);

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
/**
 * The comparison key for a project name, so names that only differ in case,
 * spacing, punctuation or a trailing domain ending count as the same name:
 * "FormBee", "form-bee", "Form Bee!" and "Formbee.app" all → "formbee".
 * Mirrored in SQL by public.listing_name_key (migration 20261114) — keep the
 * two in step.
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/\.[a-z]{2,12}$/u, "") // "formbee.app" → "formbee"
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export interface NameClash {
  /** The existing name, as it's shown on the site. */
  displayName: string;
  host: string;
}

/**
 * Is this name already used by another directory listing, or by another site on
 * the verified board? Rows for `ownHost` are ignored, so renaming your own
 * listing (or adding your own board site to the directory) never clashes with
 * itself. Inactive (removed) listings don't hold their name.
 */
async function findNameClash(
  supabase: ReturnType<typeof createServiceClient>,
  name: string,
  ownHost: string | null,
): Promise<NameClash | null> {
  const key = nameKey(name);
  if (!key) return null;
  const [{ data: listed, error: e1 }, { data: board, error: e2 }] = await Promise.all([
    supabase.from("listed_sites").select("host, display_name").eq("is_active", true),
    supabase.from("published_sites").select("site_url, display_name").eq("is_active", true),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  for (const r of listed ?? []) {
    if (r.host !== ownHost && nameKey(r.display_name) === key) return { displayName: r.display_name, host: r.host };
  }
  for (const r of board ?? []) {
    const h = hostname(r.site_url).toLowerCase();
    if (h !== ownHost && nameKey(r.display_name) === key) return { displayName: r.display_name, host: h };
  }
  return null;
}

/** The message shown when a name is taken — same wording on every path. */
export function nameTakenMessage(clash: NameClash): string {
  return `“${clash.displayName}” is already on ${siteConfig.name} (${clash.host}). Pick a different name — add what makes yours different.`;
}

/** Public check for the submit form's inline hint. */
export async function checkNameAvailable(name: string, ownHost: string | null = null): Promise<{ available: boolean; message?: string }> {
  if (!isSupabaseConfigured() || nameKey(name).length < 2) return { available: true };
  try {
    const clash = await findNameClash(createServiceClient(), name, ownHost);
    return clash ? { available: false, message: nameTakenMessage(clash) } : { available: true };
  } catch (err) {
    console.error("[listed] name check failed:", err);
    return { available: true }; // the submit-time check still applies
  }
}

/** True when a unique-violation came from the name index, not the host one. */
function isNameIndexViolation(error: unknown): boolean {
  const e = error as { code?: string; message?: string; details?: string };
  return e?.code === "23505" && /listed_sites_name_key_idx/.test(`${e.message ?? ""} ${e.details ?? ""}`);
}

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
  pricing?: string;
  platforms?: string[];
  details?: string;
  email?: string;
}

export type CreateListingResult =
  | { ok: true; host: string; ownerVerified: false }
  | {
      ok: false;
      error: string;
      // badge_missing / unreachable are retained so the badge requirement can be
      // switched back on without reshaping the type; currently unused.
      code: "invalid" | "duplicate" | "ranked" | "name_taken" | "rate_limited" | "unavailable" | "server" | "badge_missing" | "unreachable";
    };

const BADGE_FETCH_TIMEOUT_MS = 10000;
const BADGE_MAX_BYTES = 512 * 1024;

/** Homepage URLs to check for the badge: bare host and www variant. */
function badgeCandidates(host: string): string[] {
  const bare = host.replace(/^www\./, "");
  return [`https://${bare}/`, `https://www.${bare}/`];
}

/**
 * Fetch a host's homepage and report whether it carries a RealRank badge/link
 * (any mention of our domain). Tries the bare host and its www variant, and
 * reports whether we reached the site at all — so callers can tell "we loaded
 * your page but the badge isn't in the HTML" apart from "we couldn't reach your
 * site" (bot-blocked / slow host). Bounded per fetch (timeout + size cap) so a
 * hostile page can't hang or balloon memory. Reads raw HTML only — a badge
 * injected by JavaScript won't be seen. Shared by createListing (the list-time
 * requirement) and verifyOwnership (re-check of an existing listing).
 */
async function siteCarriesMarker(
  host: string,
): Promise<{ ok: true; found: boolean } | { ok: false; error: string }> {
  const marker = new URL(siteConfig.url).hostname.replace(/^www\./, ""); // e.g. realrank.lol
  let reachedAny = false;

  for (const url of badgeCandidates(host)) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(BADGE_FETCH_TIMEOUT_MS),
        headers: { "user-agent": `${siteConfig.name}Bot/1.0 (+${siteConfig.url})` },
      });
      if (!res.ok) continue; // try the next candidate (e.g. www) before giving up
      reachedAny = true;
      const buf = await res.arrayBuffer();
      const html = new TextDecoder().decode(buf.slice(0, BADGE_MAX_BYTES)).toLowerCase();
      if (html.includes(marker)) return { ok: true, found: true };
    } catch {
      // Timeout or network error on this candidate — try the next one.
    }
  }

  // Reached at least one page but no badge in the HTML → a real "missing badge".
  if (reachedAny) return { ok: true, found: false };
  // Couldn't load any variant → bot-blocked, slow host, or DNS. Distinct case.
  return { ok: false, error: `Couldn't reach ${host} to check for the badge.` };
}

/** High-precision markers of a parked / for-sale domain (not a real project). */
const PARKED_RE =
  /domain (is )?for sale|buy this domain|this domain is parked|hugedomains|sedoparking|parkingcrew|bodis\.com|dan\.com\/|undeveloped\.com|afternic/i;

/**
 * Liveness gate: does the host actually resolve and answer? Rules out dead,
 * unregistered and typo domains — the most common junk — without false-rejecting
 * a real site that bot-blocks us (any HTTP response counts as live). If the first
 * responding page is an obvious parked/for-sale template, reject that too.
 * Content quality beyond this is left to the AI verdict. Bounded (timeout + size
 * cap); tries the bare host, then the www variant.
 */
async function checkSiteLive(
  host: string,
): Promise<{ ok: true } | { ok: false; code: "unreachable" | "invalid"; error: string }> {
  for (const url of badgeCandidates(host)) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(BADGE_FETCH_TIMEOUT_MS),
        headers: { "user-agent": `${siteConfig.name}Bot/1.0 (+${siteConfig.url})` },
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const html = new TextDecoder().decode(buf.slice(0, BADGE_MAX_BYTES)).toLowerCase();
        if (PARKED_RE.test(html)) {
          return { ok: false, code: "invalid", error: "That domain looks parked or for sale, not a live project." };
        }
      }
      // Any response — even a 403/429 from a bot-blocking host — means it's live.
      return { ok: true };
    } catch {
      // DNS / connection / timeout on this candidate — try the next.
    }
  }
  return {
    ok: false,
    code: "unreachable",
    error: `We couldn't reach ${host}. Make sure the site is live, then try again.`,
  };
}

/**
 * Create a listing. Listing is free and does NOT require the badge: the site is
 * listed immediately as unverified (noindex/nofollow) and the owner can prove
 * ownership later with the badge (verifyOwnership) to earn a dofollow verified
 * checkmark. Server-side validation + spam guards (the API route adds a honeypot
 * on top): host must be a real public domain, text within limits, a known
 * category, and not already listed or ranked. A coarse per-IP hourly cap blunts
 * floods.
 */
export async function createListing(
  input: CreateListingInput,
  ip: string | null,
): Promise<CreateListingResult> {
  const host = normalizeHost(input.url);
  if (!host) return { ok: false, error: "Enter a valid website URL.", code: "invalid" };

  const displayName = input.displayName.trim().slice(0, MAX.name);
  if (displayName.length < 2 || nameKey(displayName).length < 2) {
    return { ok: false, error: "Add a project name.", code: "invalid" };
  }

  const tagline = input.tagline?.trim().slice(0, MAX.tagline) || null;
  const description = input.description?.trim().slice(0, MAX.description) || null;
  if (!description || description.length < DESC_MIN) {
    return {
      ok: false,
      error: `Add a description of at least ${DESC_MIN} characters — what it does, who it's for, and what makes it different.`,
      code: "invalid",
    };
  }
  const category = input.category && VALID_CATEGORIES.has(input.category) ? input.category : null;
  const alternativeTo = input.alternativeTo?.trim().slice(0, MAX.alternativeTo) || null;
  const pricing = input.pricing && VALID_PRICING.has(input.pricing) ? input.pricing : null;
  const platforms = Array.isArray(input.platforms)
    ? input.platforms.filter((p) => VALID_PLATFORMS.has(p)).slice(0, 8)
    : [];
  const details = input.details?.trim().slice(0, MAX.details) || null;
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
      return {
        ok: false,
        error:
          "That site is already verified on the leaderboard. If it's yours, add it to the directory from your dashboard — one click, already verified.",
        code: "ranked",
      };
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

    // Names are unique across the directory and the board, so two projects
    // can never look like the same thing.
    const clash = await findNameClash(supabase, displayName, host);
    if (clash) return { ok: false, error: nameTakenMessage(clash), code: "name_taken" };

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

    // The site must actually resolve and respond — rules out dead, unregistered
    // and typo domains before we spend an AI call or create a row.
    const live = await checkSiteLive(host);
    if (!live.ok) return { ok: false, error: live.error, code: live.code };

    // AI screen + enrichment in one Claude call: always a legitimacy verdict,
    // plus category / "alternative to" when the submitter left them blank (only
    // when confident — see lib/listing-enrich.ts). A confident "not legit"
    // verdict is rejected with its reason; everything else is best-effort, so a
    // no key / error / timeout fails OPEN and never blocks a real submission.
    let category2 = category;
    let alternativeTo2 = alternativeTo;
    try {
      const enriched = await enrichListing(
        { displayName, tagline, description },
        { needCategory: !category, needAlternativeTo: !alternativeTo },
      );
      if (enriched.legit === false && (enriched.legitConfidence ?? 0) >= LEGIT_REJECT_CONFIDENCE) {
        return {
          ok: false,
          error:
            enriched.legitReason ||
            "This doesn't look like a live product we can list yet. Add more about what it does and who it's for, then resubmit.",
          code: "invalid",
        };
      }
      if (!category2 && enriched.category) category2 = enriched.category;
      if (!alternativeTo2 && enriched.alternativeTo) alternativeTo2 = enriched.alternativeTo;
    } catch {
      /* best-effort — never block a submission on an enrichment error */
    }

    // Badge requirement is OFF for now: list immediately as unverified. The
    // owner can verify later with the badge (verifyOwnership) for a checkmark.
    const { error } = await supabase.from("listed_sites").insert({
      host,
      site_url: listingUrl(host),
      display_name: displayName,
      tagline,
      description,
      category: category2,
      alternative_to: alternativeTo2,
      pricing,
      platforms,
      details,
      submitter_email: email,
      submitted_ip: ip,
      status: "listed",
    });
    if (error) {
      // Unique-violation race: the same name or the same host won by a hair.
      if (isNameIndexViolation(error)) {
        return { ok: false, error: "That name was just taken by another listing. Pick a different name.", code: "name_taken" };
      }
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

export interface AlternativeGroup {
  slug: string;
  name: string;
  listings: Listing[];
}

/**
 * Every "alternative to" target with its listings, most-listed first. Powers the
 * /alternatives-to index, which shows the alternatives inline (not just a link
 * per target). Derived from the cached getListedSites() read — no extra query.
 */
export async function getAlternativeGroups(): Promise<AlternativeGroup[]> {
  const sites = await getListedSites();
  const map = new Map<string, AlternativeGroup>();
  for (const s of sites) {
    if (!s.alternativeTo) continue;
    const slug = altToSlug(s.alternativeTo);
    if (!slug) continue;
    const cur = map.get(slug);
    if (cur) cur.listings.push(s);
    else map.set(slug, { slug, name: s.alternativeTo.trim(), listings: [s] });
  }
  return Array.from(map.values()).sort(
    (a, b) => b.listings.length - a.listings.length || a.name.localeCompare(b.name),
  );
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

// ---------------------------------------------------------------------------
// Board → directory: a site already verified through Search Console
// ---------------------------------------------------------------------------

/** Status for listings whose ownership was proven by a Search Console connection. */
export const GSC_VERIFIED = "gsc_verified";

/** Is `host` an active site on the verified (Search Console) board? */
async function onVerifiedBoard(supabase: ReturnType<typeof createServiceClient>, host: string): Promise<boolean> {
  const { data, error } = await supabase.from("published_sites").select("site_url").eq("is_active", true);
  if (error) throw error;
  return (data ?? []).some((p) => hostname(p.site_url).toLowerCase() === host);
}

export type BoardListingResult = { ok: true; host: string } | { ok: false; error: string; code?: "name_taken" };

/**
 * Put a site the owner has already verified with Search Console into the open
 * directory — owner-verified from the start, so it can book a Spotlight. The
 * CALLER must have confirmed `userId` owns this published site (the dashboard
 * action checks published_sites.user_id); this function trusts that. An
 * existing listing for the host is upgraded rather than duplicated, and the
 * owner's board details only fill fields the listing doesn't have yet.
 */
export async function addBoardSiteToDirectory(input: {
  userId: string;
  siteUrl: string;
  displayName: string;
  description: string | null;
  category: string | null;
}): Promise<BoardListingResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "The directory isn't available in this environment yet." };
  const host = normalizeHost(hostname(input.siteUrl));
  if (!host) return { ok: false, error: "That site's address couldn't be read." };
  const nowIso = new Date().toISOString();
  try {
    const supabase = createServiceClient();
    const { data: existing, error: readErr } = await supabase
      .from("listed_sites")
      .select("id, is_active, owner_verified, claimed_by, description, category, verified_at")
      .eq("host", host)
      .maybeSingle();
    if (readErr) throw readErr;

    if (existing) {
      // A listing removed by moderation stays removed — re-adding goes through support.
      if (!existing.is_active) {
        return { ok: false, error: "This site's listing was removed. Contact support if you think that's a mistake." };
      }
      const { error } = await supabase
        .from("listed_sites")
        .update({
          owner_verified: true,
          status: GSC_VERIFIED,
          verified_at: existing.verified_at ?? nowIso,
          claimed_by: existing.claimed_by ?? input.userId,
          description: existing.description ?? input.description,
          category: existing.category ?? (input.category && VALID_CATEGORIES.has(input.category) ? input.category : null),
          updated_at: nowIso,
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const displayName = input.displayName.trim().slice(0, MAX.name) || host;
      const clash = await findNameClash(supabase, displayName, host);
      if (clash) {
        return {
          ok: false,
          error: `${nameTakenMessage(clash)} Rename your site under “Edit details”, then add it again.`,
          code: "name_taken",
        };
      }
      const { error } = await supabase.from("listed_sites").insert({
        host,
        site_url: listingUrl(host),
        display_name: displayName,
        description: input.description?.trim().slice(0, MAX.description) || null,
        category: input.category && VALID_CATEGORIES.has(input.category) ? input.category : null,
        platforms: [],
        owner_verified: true,
        status: GSC_VERIFIED,
        verified_at: nowIso,
        claimed_by: input.userId,
      });
      if (error) {
        if (isNameIndexViolation(error)) {
          return {
            ok: false,
            error: "That name was just taken by another listing. Rename your site under “Edit details”, then add it again.",
            code: "name_taken",
          };
        }
        if ((error as { code?: string }).code !== "23505") throw error; // lost a race → fine, row exists
      }
    }
    revalidateTag(LISTED_TAG);
    return { ok: true, host };
  } catch (err) {
    console.error("[listed] board → directory failed:", err);
    return { ok: false, error: "Couldn't add it to the directory. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// Spotlight (paid, labelled directory placement) + periodic badge re-check
// ---------------------------------------------------------------------------

export type SpotlightActivation =
  | { ok: true; until: string; alreadyApplied: boolean }
  /** permanent: retrying can never succeed (e.g. not owner-verified); otherwise transient. */
  | { ok: false; error: string; permanent: boolean };

/**
 * Start (or extend) a listing's Spotlight after a payment. Idempotent per
 * payment: a retried webhook carrying the same payment id changes nothing.
 * Buying again while a run is live extends it from its current end date.
 * Only owner-verified listings can be spotlighted — the same rule the checkout
 * button enforces — so a payment for anything else is refused (and should be
 * refunded by hand).
 */
export async function activateSpotlight(
  host: string,
  paymentId: string | null,
  days: number,
): Promise<SpotlightActivation> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Database not configured.", permanent: false };
  try {
    const supabase = createServiceClient();
    const { data: row, error } = await supabase
      .from("listed_sites")
      .select("*")
      .eq("host", host)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false, error: `No active listing for ${host}.`, permanent: true };
    if (!row.owner_verified) return { ok: false, error: `${host} isn't owner-verified.`, permanent: true };
    if (paymentId && row.spotlight_payment_id === paymentId && row.spotlight_until) {
      return { ok: true, until: row.spotlight_until, alreadyApplied: true };
    }

    const now = Date.now();
    const currentEnd = row.spotlight_until ? Date.parse(row.spotlight_until) : 0;
    const live = currentEnd > now;
    const start = live && row.spotlight_started_at ? row.spotlight_started_at : new Date(now).toISOString();
    const until = new Date(Math.max(now, currentEnd) + days * 24 * 60 * 60 * 1000).toISOString();

    const { error: updErr } = await supabase
      .from("listed_sites")
      .update({
        spotlight_started_at: start,
        spotlight_until: until,
        spotlight_payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("host", host);
    if (updErr) throw updErr;
    revalidateTag(LISTED_TAG);
    return { ok: true, until, alreadyApplied: false };
  } catch (err) {
    console.error("[listed] spotlight activation failed:", err);
    return { ok: false, error: "Couldn't activate the spotlight.", permanent: false };
  }
}

/** Owner-verified listings whose badge was checked longest ago (never-checked first). */
export async function getStaleVerifiedHosts(limit: number): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("listed_sites")
      .select("host")
      .eq("is_active", true)
      .eq("owner_verified", true)
      .order("badge_checked_at", { ascending: true, nullsFirst: true })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => r.host);
  } catch (err) {
    console.error("[listed] stale verified read failed:", err);
    return [];
  }
}

export type BadgeRecheck = "kept" | "removed" | "unreachable" | "error";

/**
 * Re-check that an owner-verified listing still carries the RealRank badge, so
 * "verified" means verified now, not once. Fail-safe: only a page we actually
 * reached that no longer has the badge loses verification (and the followed
 * link that comes with it). An unreachable site keeps its status and is simply
 * retried on a later run.
 */
export async function recheckBadge(host: string): Promise<BadgeRecheck> {
  if (!isSupabaseConfigured()) return "error";
  const nowIso = new Date().toISOString();
  try {
    const supabase = createServiceClient();
    // Verified through Search Console: proof holds while the site is still
    // connected on the board. If it disconnects, fall back to the badge.
    const { data: row } = await supabase.from("listed_sites").select("status").eq("host", host).maybeSingle();
    if (row?.status === GSC_VERIFIED) {
      if (await onVerifiedBoard(supabase, host)) {
        await supabase.from("listed_sites").update({ badge_checked_at: nowIso }).eq("host", host);
        return "kept";
      }
    }
    const check = await siteCarriesMarker(host);
    if (!check.ok) {
      await supabase.from("listed_sites").update({ badge_checked_at: nowIso }).eq("host", host);
      return "unreachable";
    }
    if (check.found) {
      // A badge also proves it — record that as the reason it's verified now.
      await supabase
        .from("listed_sites")
        .update({ badge_checked_at: nowIso, ...(row?.status === GSC_VERIFIED ? { status: "owner_verified" } : {}) })
        .eq("host", host);
      return "kept";
    }
    const { error } = await supabase
      .from("listed_sites")
      .update({
        owner_verified: false,
        status: "listed",
        verified_at: null,
        badge_checked_at: nowIso,
        updated_at: nowIso,
      })
      .eq("host", host);
    if (error) throw error;
    revalidateTag(LISTED_TAG);
    return "removed";
  } catch (err) {
    console.error("[listed] badge recheck failed:", err);
    return "error";
  }
}

// ---------------------------------------------------------------------------
// Owner claim + edit
//
// A logged-in user proves they control the domain by placing a one-time secret
// code (from requestListingClaim) on the site, then verifyListingClaim fetches
// the site and confirms it. On success the listing's claimed_by is set and that
// user — and only that user — can updateListing(). The public badge is NOT used
// here: it proves the site links to us, not that *this* user controls the site.
// ---------------------------------------------------------------------------

/** Bounded fetch of a host's homepage; true if the raw HTML contains `token`. */
async function siteContainsToken(
  host: string,
  token: string,
): Promise<{ ok: true; found: boolean } | { ok: false }> {
  const needle = token.toLowerCase();
  let reached = false;
  for (const url of badgeCandidates(host)) {
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(BADGE_FETCH_TIMEOUT_MS),
        headers: { "user-agent": `${siteConfig.name}Bot/1.0 (+${siteConfig.url})` },
      });
      if (!res.ok) continue;
      reached = true;
      const buf = await res.arrayBuffer();
      const html = new TextDecoder().decode(buf.slice(0, BADGE_MAX_BYTES)).toLowerCase();
      if (html.includes(needle)) return { ok: true, found: true };
    } catch {
      /* timeout / network — try the next candidate */
    }
  }
  return reached ? { ok: true, found: false } : { ok: false };
}

export interface ListingClaimInfo {
  /** The user who owns this listing, or null if unclaimed. */
  claimedBy: string | null;
  /** The user with a pending claim code out, if any. */
  pendingBy: string | null;
  /** The pending secret code (only meaningful alongside pendingBy). */
  code: string | null;
}

/** Ownership + pending-claim state for a host, for gating the edit page. */
export async function getListingClaimInfo(host: string): Promise<ListingClaimInfo | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("listed_sites")
      .select("claimed_by, claim_requested_by, claim_code")
      .eq("host", host)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      claimedBy: data.claimed_by ?? null,
      pendingBy: data.claim_requested_by ?? null,
      code: data.claim_code ?? null,
    };
  } catch (err) {
    console.error("[listed] claim info failed:", err);
    return null;
  }
}

export type ClaimRequestResult =
  | { ok: true; code: string; alreadyOwner?: boolean }
  | { ok: false; error: string };

/** Mint (or re-return) a one-time claim code for `userId` to place on the site. */
export async function requestListingClaim(host: string, userId: string): Promise<ClaimRequestResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Claiming isn't available in this environment yet." };
  try {
    const supabase = createServiceClient();
    const { data: row, error } = await supabase
      .from("listed_sites")
      .select("claimed_by, claim_code, claim_requested_by")
      .eq("host", host)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false, error: "That listing doesn't exist." };
    if (row.claimed_by === userId) return { ok: true, code: "", alreadyOwner: true };
    if (row.claimed_by) return { ok: false, error: "This listing has already been claimed by its owner." };

    // Reuse a code already issued to this same user; otherwise mint a new one.
    const code =
      row.claim_requested_by === userId && row.claim_code
        ? row.claim_code
        : `realrank-verify-${randomUUID().replace(/-/g, "").slice(0, 20)}`;

    const { error: upErr } = await supabase
      .from("listed_sites")
      .update({ claim_code: code, claim_requested_by: userId, claim_requested_at: new Date().toISOString() })
      .eq("host", host);
    if (upErr) throw upErr;
    return { ok: true, code };
  } catch (err) {
    console.error("[listed] claim request failed:", err);
    return { ok: false, error: "Couldn't start the claim. Please try again." };
  }
}

/** Confirm the user placed their claim code on the site, then set claimed_by. */
export async function verifyListingClaim(
  host: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Claiming isn't available in this environment yet." };
  try {
    const supabase = createServiceClient();
    const { data: row, error } = await supabase
      .from("listed_sites")
      .select("claimed_by, claim_code, claim_requested_by")
      .eq("host", host)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false, error: "That listing doesn't exist." };
    if (row.claimed_by === userId) return { ok: true };
    if (row.claimed_by) return { ok: false, error: "This listing has already been claimed." };
    if (!row.claim_code || row.claim_requested_by !== userId) {
      return { ok: false, error: "Start the claim first to get your verification code." };
    }

    const check = await siteContainsToken(host, row.claim_code);
    if (!check.ok) return { ok: false, error: `We couldn't reach ${host} to check. Try again in a moment.` };
    if (!check.found) {
      return { ok: false, error: `We couldn't find your verification code on ${host}. Add it to your homepage, then try again.` };
    }

    const { error: upErr } = await supabase
      .from("listed_sites")
      .update({ claimed_by: userId, claim_code: null, claim_requested_by: null, claim_requested_at: null, updated_at: new Date().toISOString() })
      .eq("host", host);
    if (upErr) throw upErr;
    revalidateTag(LISTED_TAG);
    return { ok: true };
  } catch (err) {
    console.error("[listed] claim verify failed:", err);
    return { ok: false, error: "Couldn't verify the claim. Please try again." };
  }
}

export interface UpdateListingInput {
  displayName?: string;
  tagline?: string;
  description?: string;
  category?: string;
  alternativeTo?: string;
  pricing?: string;
  platforms?: string[];
  details?: string;
}

/** Edit a listing — only the user who has claimed it may. Validates every field. */
export async function updateListing(
  host: string,
  userId: string,
  input: UpdateListingInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Editing isn't available in this environment yet." };
  try {
    const supabase = createServiceClient();
    const { data: row, error } = await supabase
      .from("listed_sites")
      .select("claimed_by")
      .eq("host", host)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false, error: "That listing doesn't exist." };
    if (!row.claimed_by || row.claimed_by !== userId) {
      return { ok: false, error: "You can only edit a listing you've claimed." };
    }

    const patch: Partial<ListedSite> = { updated_at: new Date().toISOString() };

    if (input.displayName !== undefined) {
      const name = input.displayName.trim().slice(0, MAX.name);
      if (name.length < 2 || nameKey(name).length < 2) return { ok: false, error: "Add a project name." };
      const clash = await findNameClash(supabase, name, host);
      if (clash) return { ok: false, error: nameTakenMessage(clash) };
      patch.display_name = name;
    }
    if (input.description !== undefined) {
      const desc = input.description.trim().slice(0, MAX.description);
      if (desc.length < DESC_MIN) {
        return { ok: false, error: `Description must be at least ${DESC_MIN} characters.` };
      }
      patch.description = desc;
    }
    if (input.tagline !== undefined) patch.tagline = input.tagline.trim().slice(0, MAX.tagline) || null;
    if (input.category !== undefined) {
      patch.category = input.category && VALID_CATEGORIES.has(input.category) ? input.category : null;
    }
    if (input.alternativeTo !== undefined) {
      patch.alternative_to = input.alternativeTo.trim().slice(0, MAX.alternativeTo) || null;
    }
    if (input.pricing !== undefined) {
      patch.pricing = input.pricing && VALID_PRICING.has(input.pricing) ? input.pricing : null;
    }
    if (input.platforms !== undefined) {
      patch.platforms = (Array.isArray(input.platforms) ? input.platforms : []).filter((p) => VALID_PLATFORMS.has(p)).slice(0, 8);
    }
    if (input.details !== undefined) patch.details = input.details.trim().slice(0, MAX.details) || null;

    const { error: upErr } = await supabase.from("listed_sites").update(patch).eq("host", host);
    if (upErr) {
      if (isNameIndexViolation(upErr)) return { ok: false, error: "That name was just taken by another listing. Pick a different name." };
      throw upErr;
    }
    revalidateTag(LISTED_TAG);
    return { ok: true };
  } catch (err) {
    console.error("[listed] update failed:", err);
    return { ok: false, error: "Couldn't save your changes. Please try again." };
  }
}
