import "server-only";

import { unstable_cache } from "next/cache";
import { getActiveSites, LEADERBOARD_TAG } from "@/lib/data";
import { hostname } from "@/lib/utils";
import { latestRefresh } from "@/lib/ranking";
import { computeMomentum } from "@/lib/momentum";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import { categories } from "@/lib/config";

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
// Privacy floor: a cohort (a category, a day of history) is only reported when
// at least this many qualifying sites are in it, so no reading can be traced
// back to one site.
const MIN_COHORT = 3;

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
  /** How qualifying sites' growth is spread, decline → growth. */
  distribution: GrowthBucket[];
  /** Median growth per category (only categories meeting the privacy floor). */
  byCategory: CategoryStat[];
  lastUpdated: string | null;
  usingDummyData: boolean;
}

export interface GrowthBucket {
  label: string;
  /** -2 strong decline … 0 flat … +2 strong growth (drives the colour). */
  polarity: -2 | -1 | 0 | 1 | 2;
  count: number;
  pct: number;
}

export interface CategoryStat {
  slug: string;
  label: string;
  sites: number;
  medianGrowth: number;
  index: number;
  growingPct: number;
}

export interface IndexPoint {
  /** YYYY-MM-DD — the last day of the 7-day window. */
  date: string;
  /** null when fewer than MIN_COHORT sites qualified that day. */
  index: number | null;
  sites: number;
}

const BUCKETS: { label: string; polarity: GrowthBucket["polarity"]; min: number; max: number }[] = [
  { label: "Down 50%+", polarity: -2, min: -Infinity, max: -0.5 },
  { label: "Down 10–50%", polarity: -1, min: -0.5, max: -0.1 },
  { label: "Within ±10%", polarity: 0, min: -0.1, max: 0.1 },
  { label: "Up 10–50%", polarity: 1, min: 0.1, max: 0.5 },
  { label: "Up 50%+", polarity: 2, min: 0.5, max: Infinity },
];

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

  const distribution: GrowthBucket[] = BUCKETS.map((b) => {
    const count = qualifying.filter((s) => s.growth_rate >= b.min && s.growth_rate < b.max).length;
    return { label: b.label, polarity: b.polarity, count, pct: round1((count / n) * 100) };
  });

  const byCategory: CategoryStat[] = categories
    .map((c) => {
      const cohort = qualifying.filter((s) => s.category === c.slug);
      const g = cohort.map((s) => s.growth_rate).sort((a, b) => a - b);
      const m = median(g);
      return {
        slug: c.slug,
        label: c.label,
        sites: cohort.length,
        medianGrowth: m,
        index: round1(100 * (1 + m)),
        growingPct: cohort.length ? round1((cohort.filter((s) => s.growth_rate > 0.005).length / cohort.length) * 100) : 0,
      };
    })
    .filter((c) => c.sites >= MIN_COHORT)
    .sort((a, b) => b.medianGrowth - a.medianGrowth);

  return {
    index: round1(100 * (1 + medianGrowth)),
    medianGrowth,
    totalSites: sites.length,
    qualifyingCount: qualifying.length,
    growingPct: round1((growing / n) * 100),
    decliningPct: round1((declining / n) * 100),
    flatPct: round1(((n - growing - declining) / n) * 100),
    movers,
    distribution,
    byCategory,
    lastUpdated: latestRefresh(sites),
    usingDummyData,
  };
}

/**
 * The Index reconstructed day by day from stored daily click history: for each
 * day, every active site's last 7 days vs the prior 21 (the same windows, the
 * same 100-click qualifying bar and the same median as the live reading).
 * Cached with the board, so it refreshes when the cron writes new data.
 */
export async function getIndexHistory(days = 60): Promise<IndexPoint[]> {
  const { sites, usingDummyData } = await getActiveSites();
  if (usingDummyData || !isSupabaseConfigured()) return previewHistory(days);
  return readIndexHistory(sites.map((s) => s.id).sort(), days);
}

const readIndexHistory = unstable_cache(
  async (siteIds: string[], days: number): Promise<IndexPoint[]> => {
    if (siteIds.length === 0) return [];
    try {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - (days + 28 + 7));
      const supabase = createServiceClient();
      // Page through: the API caps a single response at 1,000 rows.
      const rows: { site_id: string; date: string; clicks: number }[] = [];
      const PAGE = 1000;
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from("site_click_history")
          .select("site_id, date, clicks")
          .in("site_id", siteIds)
          .gte("date", since.toISOString().slice(0, 10))
          .order("date", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < PAGE) break;
      }
      return computeIndexHistory(rows, days);
    } catch (err) {
      console.error("[stats] index history read failed:", err);
      return [];
    }
  },
  ["index-history-v1"],
  { revalidate: 3600, tags: [LEADERBOARD_TAG] },
);

const DAY_MS = 86_400_000;
const toDay = (t: number) => new Date(t).toISOString().slice(0, 10);

export function computeIndexHistory(
  rows: { site_id: string; date: string; clicks: number }[],
  days: number,
): IndexPoint[] {
  const bySite = new Map<string, Map<string, number>>();
  let earliest = Infinity;
  for (const r of rows) {
    const m = bySite.get(r.site_id) ?? new Map<string, number>();
    m.set(r.date, r.clicks);
    bySite.set(r.site_id, m);
    earliest = Math.min(earliest, Date.parse(r.date));
  }
  if (bySite.size === 0) return [];

  // Search Console lags a couple of days, unevenly per site. End on the median
  // site's latest day so a few late reporters can't drag the last point down.
  const lastDays = [...bySite.values()].map((m) => Math.max(...[...m.keys()].map(Date.parse))).sort((a, b) => a - b);
  const end = lastDays[Math.floor(lastDays.length / 2)];
  // The first full 28-day window.
  const start = Math.max(end - (days - 1) * DAY_MS, earliest + 27 * DAY_MS);

  const sum = (m: Map<string, number>, from: number, to: number) => {
    let s = 0;
    for (let t = from; t <= to; t += DAY_MS) s += m.get(toDay(t)) ?? 0;
    return s;
  };

  const out: IndexPoint[] = [];
  for (let d = start; d <= end; d += DAY_MS) {
    const growths: number[] = [];
    for (const m of bySite.values()) {
      const recent = sum(m, d - 6 * DAY_MS, d);
      const prev = sum(m, d - 27 * DAY_MS, d - 7 * DAY_MS);
      if (prev < PREV_MIN_CLICKS) continue;
      growths.push(computeMomentum({ clicks_7d: recent, clicks_28d: recent + prev }).growthRate);
    }
    growths.sort((a, b) => a - b);
    out.push({
      date: toDay(d),
      index: growths.length >= MIN_COHORT ? round1(100 * (1 + median(growths))) : null,
      sites: growths.length,
    });
  }
  return out;
}

/** Preview-only series so the chart renders without a database. Never used live. */
function previewHistory(days: number): IndexPoint[] {
  const end = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) - 2 * DAY_MS;
  return Array.from({ length: days }, (_, i) => {
    const t = i / (days - 1);
    return {
      date: toDay(end - (days - 1 - i) * DAY_MS),
      index: round1(97 + 9 * t + 2.2 * Math.sin(i * 0.45) + 1.1 * Math.sin(i * 1.7)),
      sites: 12 + Math.round(t * 10),
    };
  });
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
