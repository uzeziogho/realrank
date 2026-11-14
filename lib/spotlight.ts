import { siteConfig } from "@/lib/config";
import type { Listing } from "@/lib/listed";

/**
 * Spotlight — RealRank's paid placement, built around the core rule: money buys
 * labelled visibility, never a rank, a "verified" mark, or a followed link.
 *
 *  - Owner-verified listings only (the owner proved the site is theirs).
 *  - A separate, labelled lane on the directory pages; never inserted into the
 *    ranked leaderboard and never touching anyone's momentum score.
 *  - Outbound links in the lane are rel="sponsored".
 *  - A fixed number of concurrent slots, so a spotlight actually stands out.
 *  - Results are shown honestly afterwards (clicks sent during vs before).
 *
 * Offer terms live here so every surface quotes the same numbers.
 */
export const SPOTLIGHT = {
  price: "$25",
  days: 7,
  slots: 3,
} as const;

const DAY_MS = 86_400_000;

/** A booked run: live now, or queued to start when a slot frees up. */
function windowOf(l: Listing): { start: number; end: number } | null {
  if (!l.ownerVerified || !l.spotlightUntil) return null;
  const end = Date.parse(l.spotlightUntil);
  const start = l.spotlightStartedAt ? Date.parse(l.spotlightStartedAt) : end - SPOTLIGHT.days * DAY_MS;
  return { start, end };
}

/** Live right now (started, not ended). A queued booking isn't live yet. */
export function isSpotlighted(listing: Listing, now = Date.now()): boolean {
  const w = windowOf(listing);
  return Boolean(w && w.start <= now && w.end > now);
}

/** Booked and paid, waiting for a free slot. */
export function isSpotlightQueued(listing: Listing, now = Date.now()): boolean {
  const w = windowOf(listing);
  return Boolean(w && w.start > now && w.end > now);
}

/** Paid spotlights that are live right now, earliest-booked first. */
export function activeSpotlights(listings: Listing[], now = Date.now()): Listing[] {
  return listings
    .filter((l) => isSpotlighted(l, now))
    .sort((a, b) => windowOf(a)!.start - windowOf(b)!.start);
}

/**
 * When a new `days`-long run could start without ever putting more than
 * `slots` spotlights live at once: now if there's room for the whole run,
 * otherwise the first moment a slot frees up for long enough. Runs are the
 * live and queued bookings. Pure, so the booking pages and the payment
 * webhook agree on the date.
 */
export function earliestSpotlightStart(
  runs: { start: number; end: number }[],
  now = Date.now(),
  days: number = SPOTLIGHT.days,
  slots: number = SPOTLIGHT.slots,
): number {
  const len = days * DAY_MS;
  const upcoming = runs.filter((r) => r.end > now);
  const candidates = [now, ...upcoming.map((r) => r.end)].sort((a, b) => a - b);
  for (const t of candidates) {
    // Occupancy only rises when a run starts, so check t and every start inside [t, t + len).
    const checkpoints = [t, ...upcoming.map((r) => r.start).filter((s) => s > t && s < t + len)];
    const fits = checkpoints.every((p) => upcoming.filter((r) => r.start <= p && r.end > p).length < slots);
    if (fits) return t;
  }
  return candidates[candidates.length - 1];
}

/** Every booked run (live or queued), for scheduling. */
export function spotlightRuns(listings: Listing[], now = Date.now()): { start: number; end: number }[] {
  return listings.map(windowOf).filter((w): w is { start: number; end: number } => Boolean(w && w.end > now));
}

/**
 * Slots live right now, and when a run booked today would start: `nextOpens`
 * is null when it would start immediately, otherwise the ISO date it's queued
 * for. Booking is never refused for want of a slot — it queues.
 */
export function spotlightAvailability(listings: Listing[], now = Date.now()): {
  slotsLeft: number;
  nextOpens: string | null;
} {
  const slotsLeft = Math.max(0, SPOTLIGHT.slots - activeSpotlights(listings, now).length);
  const start = earliestSpotlightStart(spotlightRuns(listings, now), now);
  return { slotsLeft, nextOpens: start > now ? new Date(start).toISOString() : null };
}

/**
 * Checkout link for spotlighting `host` (a Dodo static payment link set in
 * SPOTLIGHT_CHECKOUT_URL). The host travels as metadata so the payment webhook
 * knows which listing to activate, and the buyer is returned to their listing.
 * Server-only (reads the environment); null when checkout isn't configured.
 */
export function spotlightCheckoutUrl(host: string): string | null {
  const raw = process.env.SPOTLIGHT_CHECKOUT_URL?.trim();
  if (!raw || !/^https:\/\//.test(raw)) return null;
  try {
    const u = new URL(raw);
    u.searchParams.set("quantity", "1");
    u.searchParams.set("metadata_kind", "spotlight");
    u.searchParams.set("metadata_host", host);
    u.searchParams.set("redirect_url", `${siteConfig.url}/listed/${host}?spotlight=success`);
    return u.toString();
  } catch {
    return null;
  }
}

/** "Nov 17" — short, unambiguous date for slot/expiry copy. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
