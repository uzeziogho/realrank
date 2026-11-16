/**
 * Countries whose directory submissions are silently accepted and then dropped,
 * by ISO-3166-1 alpha-2 code (Vercel's `x-vercel-ip-country` header):
 *
 *   CN — mainland China (Hong Kong HK, Macau MO and Taiwan TW are allowed)
 *   SG — Singapore
 *
 * Edit this list to change coverage, and keep BLOCKED in
 * scripts/remove-geo-listings.mjs in step (it cleans up existing listings).
 * It's a volume filter: a VPN routes around IP geo, which is why the content
 * fit gate (lib/offtopic.ts) runs too. Fail-open: the header is absent off
 * Vercel, so an unknown country is allowed through.
 */
export const BLOCKED_COUNTRIES: ReadonlySet<string> = new Set(["CN", "SG"]);

export function isBlockedCountry(code: string | null | undefined): boolean {
  return Boolean(code && BLOCKED_COUNTRIES.has(code.toUpperCase()));
}
