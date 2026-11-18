import "server-only";

import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getActiveSites, LEADERBOARD_TAG } from "@/lib/data";
import { MIN_RANKED_FOR_CATEGORY } from "@/lib/indexing";
import { siteSlug } from "@/lib/site";
import type { PublishedSite } from "@/lib/supabase/types";

/**
 * Monthly "fastest-growing websites" snapshots (/best/fastest-growing/YYYY-MM).
 *
 * Each completed month gets its own page ranking sites by how much their
 * verified organic clicks grew against the month before — the same momentum
 * shape as the live board (growth of the daily rate × log of volume), just over
 * calendar months. Pages accumulate one per month, so they can rank for
 * "fastest growing websites <month> <year>" long after the live list has moved on.
 *
 * Computed from site_click_history (daily clicks pulled from Search Console),
 * so no extra storage: a month's page is stable once the month is complete.
 */

export type MonthKey = `${number}-${number}`;

export const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Months a snapshot can look back over (bounded by the 90-day backfill + daily refresh). */
const MAX_MONTHS = 12;

/** Search Console runs ~2–3 days behind: a month is "complete" this many days after it ends. */
const GSC_LAG_DAYS = 3;

/** How many sites a snapshot page lists. */
export const SNAPSHOT_TOP_N = 25;

/** New sites backfill this many days of history when they connect. */
const BACKFILL_DAYS = 90;

const DAY_MS = 86_400_000;

function monthStart(key: string): Date {
  const [, y, m] = MONTH_RE.exec(key)!;
  return new Date(Date.UTC(Number(y), Number(m) - 1, 1));
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function keyOf(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function daysIn(d: Date): number {
  return Math.round((addMonths(d, 1).getTime() - d.getTime()) / DAY_MS);
}

/** "November 2026" */
export function monthLabel(key: string): string {
  return monthStart(key).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function isMonthKey(s: string): boolean {
  return MONTH_RE.test(s);
}

/** The most recent completed months, newest first. */
export function completedMonths(now = new Date(), count = MAX_MONTHS): string[] {
  // The newest complete month is the latest one whose end + lag is in the past.
  let m = addMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), -1);
  if (addMonths(m, 1).getTime() + GSC_LAG_DAYS * DAY_MS > now.getTime()) m = addMonths(m, -1);
  return Array.from({ length: count }, (_, i) => keyOf(addMonths(m, -i)));
}

// ── Reading monthly totals ────────────────────────────────────────────────

/** site id → month key → clicks */
type Totals = Map<string, Map<string, number>>;

function addTo(totals: Totals, siteId: string, month: string, clicks: number) {
  let m = totals.get(siteId);
  if (!m) totals.set(siteId, (m = new Map()));
  m.set(month, (m.get(month) ?? 0) + clicks);
}

/**
 * Monthly click totals for every site, over the snapshot window (plus the month
 * before the oldest, for its comparison). Reads the site_click_monthly view;
 * if that migration hasn't been applied yet, sums the daily rows instead.
 */
const readMonthlyTotals = unstable_cache(
  async (fromIso: string): Promise<[string, [string, number][]][]> => {
    const supabase = createServiceClient();
    const totals: Totals = new Map();

    const view = await supabase.from("site_click_monthly").select("site_id,month,clicks").gte("month", fromIso);
    if (!view.error) {
      for (const r of view.data ?? []) addTo(totals, r.site_id, r.month.slice(0, 7), Number(r.clicks));
    } else {
      // Fallback: page through the daily rows (1,000 per request).
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("site_click_history")
          .select("site_id,date,clicks")
          .gte("date", fromIso)
          .order("site_id")
          .order("date")
          .range(from, from + 999);
        if (error) throw error;
        for (const r of data ?? []) addTo(totals, r.site_id, r.date.slice(0, 7), r.clicks);
        if (!data || data.length < 1000) break;
      }
    }
    // Maps don't survive the cache's JSON round-trip; send plain arrays.
    return [...totals].map(([id, m]) => [id, [...m]]);
  },
  ["monthly-totals-v1"],
  { revalidate: 86_400, tags: [LEADERBOARD_TAG] },
);

/** Preview data (no Supabase): plausible monthly totals derived from the seed board. */
function dummyTotals(sites: PublishedSite[], months: string[]): Totals {
  const totals: Totals = new Map();
  sites.forEach((s, i) => {
    const base = Math.max(s.clicks_28d, 1) * 1.08;
    months.forEach((m, j) => {
      const wobble = 0.82 + (((i + 3) * (j + 5) * 7) % 13) * 0.035; // ~0.82–1.24
      const trend = Math.pow(1 + (s.growth_rate ?? 0) * 0.25, -j);
      addTo(totals, s.id, m, Math.round(base * wobble * trend));
    });
  });
  return totals;
}

async function loadTotals(sites: PublishedSite[], months: string[], dummy: boolean): Promise<Totals> {
  const oldest = addMonths(monthStart(months[months.length - 1]), -1);
  if (dummy || !isSupabaseConfigured()) return dummyTotals(sites, [...months, keyOf(oldest)]);
  const rows = await readMonthlyTotals(oldest.toISOString().slice(0, 10));
  return new Map(rows.map(([id, m]) => [id, new Map(m)]));
}

// ── Ranking a month ───────────────────────────────────────────────────────

export interface SnapshotEntry {
  rank: number;
  id: string;
  name: string;
  slug: string;
  siteUrl: string;
  category: string | null;
  clicks: number;
  prevClicks: number;
  /** Growth of the average daily click rate vs the previous month (0.5 = +50%). */
  growthRate: number;
  score: number;
}

export interface MonthSnapshot {
  month: string;
  label: string;
  prevLabel: string;
  entries: SnapshotEntry[];
  totalClicks: number;
  prevTotalClicks: number;
  growing: number;
  /** Enough ranked sites to be a real, indexable ranking. */
  indexable: boolean;
}

function rankMonth(month: string, sites: PublishedSite[], totals: Totals): MonthSnapshot {
  const start = monthStart(month);
  const prev = addMonths(start, -1);
  const prevKey = keyOf(prev);
  const days = daysIn(start);
  const prevDays = daysIn(prev);

  const entries: Omit<SnapshotEntry, "rank">[] = [];
  for (const s of sites) {
    // The comparison month must sit inside the history the site had backfilled
    // when it joined; otherwise a missing month would look like a huge jump.
    const coveredFrom = new Date(s.created_at).getTime() - BACKFILL_DAYS * DAY_MS;
    if (coveredFrom > prev.getTime()) continue;

    const t = totals.get(s.id);
    const clicks = t?.get(month) ?? 0;
    const prevClicks = t?.get(prevKey) ?? 0;
    if (clicks <= 0) continue;

    const rate = clicks / days;
    const prevRate = prevClicks / prevDays;
    const growthRate = prevRate > 0 ? (rate - prevRate) / prevRate : 1;
    const score = Math.round((1 + growthRate) * Math.log10(clicks + 1) * 10_000) / 100;
    entries.push({
      id: s.id,
      name: s.display_name,
      slug: siteSlug(s.site_url),
      siteUrl: s.site_url,
      category: s.category,
      clicks,
      prevClicks,
      growthRate: Math.round(growthRate * 10_000) / 10_000,
      score,
    });
  }

  entries.sort((a, b) => b.score - a.score || b.clicks - a.clicks);
  return {
    month,
    label: monthLabel(month),
    prevLabel: monthLabel(prevKey),
    entries: entries.map((e, i) => ({ ...e, rank: i + 1 })),
    totalClicks: entries.reduce((n, e) => n + e.clicks, 0),
    prevTotalClicks: entries.reduce((n, e) => n + e.prevClicks, 0),
    growing: entries.filter((e) => e.growthRate > 0).length,
    indexable: entries.length >= MIN_RANKED_FOR_CATEGORY,
  };
}

/** Every completed month in the window, newest first (empty months included). */
async function allSnapshots(): Promise<MonthSnapshot[]> {
  const months = completedMonths();
  try {
    const { sites, usingDummyData } = await getActiveSites();
    const totals = await loadTotals(sites, months, usingDummyData);
    return months.map((m) => rankMonth(m, sites, totals));
  } catch (err) {
    console.error("[monthly] snapshot read failed:", err);
    return [];
  }
}

/** One month's snapshot, or null if it's outside the window or not complete yet. */
export async function getMonthSnapshot(month: string): Promise<MonthSnapshot | null> {
  if (!isMonthKey(month)) return null;
  return (await allSnapshots()).find((s) => s.month === month) ?? null;
}

/**
 * Months with a real ranking (enough sites), newest first — for the archive
 * links and the sitemap, which must agree with each page's own noindex rule.
 */
export async function getSnapshotMonths(): Promise<{ month: string; label: string; leader: string | null; count: number }[]> {
  return (await allSnapshots())
    .filter((s) => s.indexable)
    .map((s) => ({ month: s.month, label: s.label, leader: s.entries[0]?.name ?? null, count: s.entries.length }));
}
