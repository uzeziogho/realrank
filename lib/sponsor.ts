import { siteConfig } from "@/lib/config";

/**
 * Sponsor — a fixed, labelled "Sponsored" row on the leaderboard, billed
 * monthly through a Dodo subscription. Like Spotlight it buys visibility only:
 * the row sits between ranked sites, never changes anyone's rank, and its link
 * is rel="sponsored nofollow".
 *
 * Offer terms live here so every surface quotes the same numbers.
 */
export const SPONSOR = {
  price: "$49",
  cadence: "month",
  /** Board positions a sponsor row can occupy: shown right after these ranks. */
  positions: [3, 10] as readonly number[],
  /**
   * Days a slot stays up past the paid-through date while a renewal is
   * processing, so a slow or retried charge doesn't blink the slot off.
   * Cancelling ends the slot at the paid-through date, without grace.
   */
  graceDays: 3,
  nameMax: 40,
  pitchMax: 90,
} as const;

export interface SponsorDetails {
  url: string;
  name: string;
  pitch: string | null;
}

/** Validate the advertiser's details; null when they aren't usable. */
export function cleanSponsorDetails(input: { url?: unknown; name?: unknown; pitch?: unknown }): SponsorDetails | null {
  const rawUrl = typeof input.url === "string" ? input.url.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim().replace(/\s+/g, " ").slice(0, SPONSOR.nameMax) : "";
  const pitch =
    typeof input.pitch === "string" ? input.pitch.trim().replace(/\s+/g, " ").slice(0, SPONSOR.pitchMax) || null : null;
  if (!rawUrl || name.length < 2) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname)) return null;
  url.protocol = "https:";
  url.hash = "";
  return { url: url.toString().replace(/\/$/, ""), name, pitch };
}

/**
 * Checkout link for a sponsor subscription (a Dodo subscription payment link
 * in SPONSOR_CHECKOUT_URL). The ad details travel as metadata so the webhook
 * can put the row live without anyone typing them in twice. Server-only (reads
 * the environment); null when checkout isn't configured.
 */
export function sponsorCheckoutUrl(details: SponsorDetails): string | null {
  const raw = process.env.SPONSOR_CHECKOUT_URL?.trim();
  if (!raw || !/^https:\/\//.test(raw)) return null;
  try {
    const u = new URL(raw);
    u.searchParams.set("quantity", "1");
    u.searchParams.set("metadata_kind", "sponsor");
    u.searchParams.set("metadata_url", details.url);
    u.searchParams.set("metadata_name", details.name);
    if (details.pitch) u.searchParams.set("metadata_pitch", details.pitch);
    u.searchParams.set("redirect_url", `${siteConfig.url}/sponsor?status=success`);
    return u.toString();
  } catch {
    return null;
  }
}
