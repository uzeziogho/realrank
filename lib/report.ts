import "server-only";

import { getLeaderboardData } from "@/lib/data";
import { getStatsData } from "@/lib/stats";
import { getListedSites } from "@/lib/listed";
import { categories } from "@/lib/config";
import { formatGrowth } from "@/lib/utils";

/**
 * The "State of Indie Organic Traffic" dataset — a flagship, citable report
 * assembled entirely from RealRank's own verified Google Search Console data
 * (no third-party estimates). Everything here is derived from the cached public
 * reads, so the page adds no new queries. Built to be quoted: trafficked blogs
 * citing these numbers is exactly the backlink that moves DR4.
 */

export interface ReportCategory {
  slug: string;
  label: string;
  sites: number;
  clicks28d: number;
  medianGrowth: number;
  medianGrowthLabel: string;
}

export interface IndieReport {
  period: string;
  lastUpdated: string | null;
  /** Verified, ranked sites (Search Console connected). */
  verifiedSites: number;
  /** Open-directory projects (verified + unverified). */
  listedProjects: number;
  /** Total verified organic clicks across all sites in the last 28 days. */
  totalClicks28d: number;
  /** Median 28-day organic clicks for a site that has any traffic. */
  medianClicks28d: number;
  /** Share of all organic clicks held by the top 10% of sites (concentration). */
  topDecileSharePct: number;
  /** The RealRank Index (100 = flat) and the growing/declining split. */
  index: number;
  growingPct: number;
  decliningPct: number;
  medianGrowth: number;
  medianGrowthLabel: string;
  /** Per-category cuts, most organic clicks first. */
  categories: ReportCategory[];
  /** Fastest-growing category with a real sample, or null. */
  fastestCategory: ReportCategory | null;
  /** How many verified sites actually had traffic this window (the stat sample). */
  sampleSites: number;
  usingDummyData: boolean;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** A category needs at least this many sites with traffic to get a growth figure. */
const MIN_CATEGORY_SAMPLE = 3;

export async function getIndieReport(): Promise<IndieReport> {
  const [board, stats, listed] = await Promise.all([
    getLeaderboardData("momentum"),
    getStatsData(),
    getListedSites(),
  ]);

  // Only sites with real traffic this window — exclude pending / no-click rows.
  const active = board.organic.filter((s) => !s.pending && s.clicks28d > 0);
  const clicksDesc = active.map((s) => s.clicks28d).sort((a, b) => b - a);
  const totalClicks28d = clicksDesc.reduce((a, b) => a + b, 0);

  const topN = Math.max(1, Math.round(active.length * 0.1));
  const topDecileShare =
    totalClicks28d > 0 ? clicksDesc.slice(0, topN).reduce((a, b) => a + b, 0) / totalClicks28d : 0;

  const cats: ReportCategory[] = categories
    .map((c) => {
      const inCat = active.filter((s) => s.category === c.slug);
      const med = median(inCat.map((s) => s.growthRate));
      return {
        slug: c.slug,
        label: c.label,
        sites: inCat.length,
        clicks28d: inCat.reduce((a, s) => a + s.clicks28d, 0),
        medianGrowth: med,
        medianGrowthLabel: formatGrowth(med),
      };
    })
    .filter((c) => c.sites > 0)
    .sort((a, b) => b.clicks28d - a.clicks28d);

  const eligible = cats.filter((c) => c.sites >= MIN_CATEGORY_SAMPLE);
  const fastestCategory =
    eligible.length > 0 ? [...eligible].sort((a, b) => b.medianGrowth - a.medianGrowth)[0] : null;

  return {
    period: new Date(stats.lastUpdated ?? Date.now()).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    lastUpdated: stats.lastUpdated,
    verifiedSites: board.totalSites,
    listedProjects: listed.length,
    totalClicks28d,
    medianClicks28d: Math.round(median(active.map((s) => s.clicks28d))),
    topDecileSharePct: Math.round(topDecileShare * 100),
    index: stats.index,
    growingPct: stats.growingPct,
    decliningPct: stats.decliningPct,
    medianGrowth: stats.medianGrowth,
    medianGrowthLabel: formatGrowth(stats.medianGrowth),
    categories: cats,
    fastestCategory,
    sampleSites: active.length,
    usingDummyData: board.usingDummyData || stats.usingDummyData,
  };
}
