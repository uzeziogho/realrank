/**
 * Momentum scoring — the heart of RealRank's default ranking.
 *
 * Goal: let a fast-growing small site compete with a large established one,
 * without letting statistical noise (5 → 15 clicks) top a steady 40k-click site.
 *
 * Inputs come straight from Google Search Console:
 *   - clicks_7d:  organic clicks in the last 7 days
 *   - clicks_28d: organic clicks in the last 28 days
 *
 * The "previous" window is days 8–28 (21 days) so we compare like-for-like
 * daily rates instead of unequal-length totals.
 */

export interface MomentumInput {
  clicks_7d: number;
  clicks_28d: number;
}

export interface MomentumResult {
  /** Composite score used for ordering. Higher = stronger momentum. */
  momentumScore: number;
  /** Week-over-prior growth of the daily click rate, as a ratio (0.5 = +50%). */
  growthRate: number;
  /** Average daily clicks in the recent 7-day window. */
  dailyRecent: number;
  /** Average daily clicks across the prior 21-day window. */
  dailyPrev: number;
}

export function computeMomentum({ clicks_7d, clicks_28d }: MomentumInput): MomentumResult {
  const recent = Math.max(clicks_7d, 0);
  const prev21 = Math.max(clicks_28d - clicks_7d, 0);

  const dailyRecent = recent / 7;
  const dailyPrev = prev21 / 21;

  // Growth of the daily rate. If there was no prior traffic, treat any recent
  // traffic as a full +100% (new/relaunched site), otherwise neutral.
  const growthRate =
    dailyPrev > 0
      ? (dailyRecent - dailyPrev) / dailyPrev
      : dailyRecent > 0
        ? 1
        : 0;

  // Volume weight dampens absolute size logarithmically: big sites still get
  // credit, but a whale can't sit at #1 on volume alone while shrinking.
  const volumeWeight = Math.log10(recent + 1);

  // (1 + growthRate) keeps the baseline positive so a flat site scores on volume,
  // a grower is boosted, and a shrinking site is penalized below its flat peers.
  const momentumScore = round2((1 + growthRate) * volumeWeight * 100);

  return {
    momentumScore,
    growthRate: round4(growthRate),
    dailyRecent: round2(dailyRecent),
    dailyPrev: round2(dailyPrev),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
