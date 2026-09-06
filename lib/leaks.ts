import "server-only";

import { getUserGscClient } from "@/lib/gsc-server";
import { fetchSearchAnalytics, type SearchAnalyticsRow } from "@/lib/google";

/**
 * Search-to-revenue leak analysis.
 *
 * The first place traffic (and therefore revenue) leaks is the search results
 * page: you rank for a query but don't earn the click, or you sit just off
 * page 1 where almost no one scrolls. Both are measurable from verified Search
 * Console data — no estimates. We compare each query's actual CTR to a typical
 * CTR for its average position to flag where clicks are being left on the table.
 */

export interface LeakRow {
  /** The search query. */
  key: string;
  clicks: number;
  impressions: number;
  /** Actual click-through rate (0–1). */
  ctr: number;
  /** Average position in results (1 = top). */
  position: number;
  /** Typical CTR for this position (0–1) — the benchmark, not a promise. */
  expectedCtr: number;
  /**
   * Recoverable clicks per 28 days: for CTR leaks, the gap between expected and
   * actual CTR at the current position; for striking-distance queries, the gain
   * from reaching the lower third of page 1.
   */
  opportunityClicks: number;
}

export interface SearchLeaks {
  /** Page-1 rankings whose CTR badly trails what the position usually earns. */
  ctrLeaks: LeakRow[];
  /** Page-2 queries (positions ~11–20) with real impression volume to chase. */
  strikingDistance: LeakRow[];
  /** Sum of recoverable clicks across the CTR-leak bucket. */
  totalMissedClicks: number;
  windowDays: number;
  analyzedAt: string;
}

/**
 * Industry-typical organic CTR by average position (blended desktop + mobile).
 * Index is 1-based position; only used to estimate "clicks left on the table",
 * so treat it as a heuristic benchmark rather than a guarantee.
 */
const CTR_CURVE = [
  0, // index 0 unused — positions are 1-based
  0.28, 0.15, 0.1, 0.07, 0.05, 0.04, 0.032, 0.026, 0.021, 0.018, // positions 1–10
];

/** Below this, a query is long-tail noise not worth surfacing. */
const MIN_IMPRESSIONS = 50;

/** The position we assume a striking-distance query could realistically reach. */
const STRIKING_TARGET_POSITION = 8;

export function expectedCtr(position: number): number {
  if (position < 1) return 0;
  const p = Math.round(position);
  if (p <= 10) return CTR_CURVE[p];
  if (p <= 20) return 0.01; // page 2 — almost no clicks
  return 0.005;
}

/**
 * Analyze a single verified property for the signed-in user. Returns null when
 * the user hasn't connected Google; returns empty buckets (not null) on a GSC
 * error so the page can still render a clean "nothing to show" state.
 */
export async function getSearchLeaks(
  userId: string,
  siteUrl: string,
): Promise<SearchLeaks | null> {
  const client = await getUserGscClient(userId);
  if (!client) return null;

  const windowDays = 28;
  const empty: SearchLeaks = {
    ctrLeaks: [],
    strikingDistance: [],
    totalMissedClicks: 0,
    windowDays,
    analyzedAt: new Date().toISOString(),
  };

  let rows: SearchAnalyticsRow[] = [];
  try {
    rows = await fetchSearchAnalytics(client, siteUrl, {
      dimension: "query",
      days: windowDays,
      rowLimit: 500,
    });
  } catch (err) {
    console.error("[leaks] fetchSearchAnalytics failed:", err);
    return empty;
  }

  const withVolume = rows.filter((r) => r.impressions >= MIN_IMPRESSIONS);

  const ctrLeaks = withVolume
    .filter((r) => r.position <= 10.5)
    .map(toCtrLeak)
    // Only real underperformance: CTR well below the benchmark and ≥1 lost click.
    .filter((r) => r.opportunityClicks >= 1 && r.ctr < r.expectedCtr * 0.6)
    .sort((a, b) => b.opportunityClicks - a.opportunityClicks)
    .slice(0, 20);

  const strikingDistance = withVolume
    .filter((r) => r.position > 10.5 && r.position <= 20.5)
    .map(toStrikingDistance)
    .filter((r) => r.opportunityClicks >= 1)
    .sort((a, b) => b.opportunityClicks - a.opportunityClicks)
    .slice(0, 20);

  const totalMissedClicks = ctrLeaks.reduce((sum, r) => sum + r.opportunityClicks, 0);

  return { ctrLeaks, strikingDistance, totalMissedClicks, windowDays, analyzedAt: empty.analyzedAt };
}

function toCtrLeak(r: SearchAnalyticsRow): LeakRow {
  const exp = expectedCtr(r.position);
  const opportunityClicks = Math.max(0, Math.round((exp - r.ctr) * r.impressions));
  return { ...r, expectedCtr: exp, opportunityClicks };
}

function toStrikingDistance(r: SearchAnalyticsRow): LeakRow {
  const exp = expectedCtr(r.position);
  // Clicks gained by climbing from page 2 to the lower third of page 1.
  const target = expectedCtr(STRIKING_TARGET_POSITION);
  const opportunityClicks = Math.max(0, Math.round(target * r.impressions) - r.clicks);
  return { ...r, expectedCtr: exp, opportunityClicks };
}
