import "server-only";

import { getActiveSites } from "@/lib/data";
import { hostname } from "@/lib/utils";
import { latestRefresh } from "@/lib/ranking";

/**
 * Anonymized, cohort-level organic-search stats derived from published sites.
 *
 * Everything here is computed from data we actually verify (7d/28d clicks and
 * the momentum growth rate). No per-query, per-page, or per-country data is used
 * or exposed — only aggregate conclusions across qualifying sites.
 */

// A site must have real prior-period traffic to count, so noise (5 → 15 clicks)
// can't distort the market index or the movers list.
const PREV_MIN_CLICKS = 100;
const MOVERS_LIMIT = 5;

export interface Mover {
  rank: number;
  displayName: string;
  siteUrl: string;
  host: string;
  currentClicks: number;
  growthRate: number;
}

export interface StatsData {
  /** 100 = flat. >100 = the median site is growing. */
  index: number;
  medianGrowth: number;
  totalSites: number;
  qualifyingCount: number;
  growingPct: number;
  decliningPct: number;
  flatPct: number;
  movers: Mover[];
  lastUpdated: string | null;
  usingDummyData: boolean;
}

export async function getStatsData(): Promise<StatsData> {
  const { sites, usingDummyData } = await getActiveSites();

  const qualifying = sites.filter(
    (s) => Math.max(s.clicks_28d - s.clicks_7d, 0) >= PREV_MIN_CLICKS,
  );

  const growths = qualifying.map((s) => s.growth_rate).sort((a, b) => a - b);
  const medianGrowth = median(growths);

  const growing = qualifying.filter((s) => s.growth_rate > 0.005).length;
  const declining = qualifying.filter((s) => s.growth_rate < -0.005).length;
  const n = qualifying.length || 1;

  const movers: Mover[] = [...qualifying]
    .sort((a, b) => b.growth_rate - a.growth_rate)
    .slice(0, MOVERS_LIMIT)
    .map((s, i) => ({
      rank: i + 1,
      displayName: s.display_name,
      siteUrl: s.site_url,
      host: hostname(s.site_url),
      currentClicks: s.clicks_7d,
      growthRate: s.growth_rate,
    }));

  return {
    index: round1(100 * (1 + medianGrowth)),
    medianGrowth,
    totalSites: sites.length,
    qualifyingCount: qualifying.length,
    growingPct: round1((growing / n) * 100),
    decliningPct: round1((declining / n) * 100),
    flatPct: round1(((n - growing - declining) / n) * 100),
    movers,
    lastUpdated: latestRefresh(sites),
    usingDummyData,
  };
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
