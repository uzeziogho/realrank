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

/** Paid spotlights that are live right now, earliest-booked first. */
export function activeSpotlights(listings: Listing[], now = Date.now()): Listing[] {
  return listings
    .filter((l) => l.ownerVerified && l.spotlightUntil && Date.parse(l.spotlightUntil) > now)
    .sort((a, b) => Date.parse(a.spotlightStartedAt ?? a.spotlightUntil!) - Date.parse(b.spotlightStartedAt ?? b.spotlightUntil!));
}

export function isSpotlighted(listing: Listing, now = Date.now()): boolean {
  return Boolean(listing.ownerVerified && listing.spotlightUntil && Date.parse(listing.spotlightUntil) > now);
}

/** Slots still open, and when the next one frees up if they're all taken. */
export function spotlightAvailability(listings: Listing[], now = Date.now()): {
  slotsLeft: number;
  nextOpens: string | null;
} {
  const live = activeSpotlights(listings, now);
  const slotsLeft = Math.max(0, SPOTLIGHT.slots - live.length);
  const nextOpens =
    slotsLeft > 0 || live.length === 0
      ? null
      : live.map((l) => l.spotlightUntil!).sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  return { slotsLeft, nextOpens };
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
