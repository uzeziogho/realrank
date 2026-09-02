import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { PublishedSite, SponsoredSlot } from "@/lib/supabase/types";
import { DUMMY_SITES, DUMMY_SPONSORED } from "@/lib/dummy-data";
import { rankSites, injectSponsored, latestRefresh } from "@/lib/ranking";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import { hostname } from "@/lib/utils";
import { siteConfig } from "@/lib/config";
import type { LeaderboardRow, RankedSite, RankingView } from "@/lib/types";

export interface LeaderboardData {
  rows: LeaderboardRow[];
  organic: RankedSite[];
  /** Active sponsored slots, so callers can re-inject ads per paginated page. */
  sponsored: SponsoredSlot[];
  lastUpdated: string | null;
  totalSites: number;
  totalClicks28d: number;
  /** How many sites qualify for each view (for the toggle counts). */
  counts: { momentum: number; volume: number };
  /** Founding program: created_at cutoff (≤ = founding) and spots remaining. */
  founding: FoundingInfo;
  usingDummyData: boolean;
}

export interface FoundingInfo {
  /** created_at of the last founding site; a site is founding if created_at ≤ this. */
  cutoff: string | null;
  /** Founding spots still open (0 once the program is full). */
  spotsLeft: number;
  /** Founding spots already claimed. */
  claimed: number;
  /** Total founding spots in the program. */
  total: number;
}

/** Compute founding status from all active sites (first N by join date). */
export function computeFounding(sites: PublishedSite[]): FoundingInfo {
  const total = siteConfig.foundingSpots;
  const active = sites.filter((s) => s.is_active);
  const byAge = [...active].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  const claimed = Math.min(active.length, total);
  const cutoff = byAge.length > 0 ? byAge[Math.min(byAge.length, total) - 1].created_at : null;
  return { cutoff, spotsLeft: Math.max(0, total - active.length), claimed, total };
}

/** Whether a site (by its join date) is a founding member. */
export function isFounding(createdAt: string, cutoff: string | null): boolean {
  return cutoff !== null && createdAt <= cutoff;
}

/**
 * Single source of truth for the public leaderboard.
 * Reads from Supabase when configured; otherwise falls back to seed data so the
 * app renders end-to-end during development. Called from Server Components.
 */
export async function getLeaderboardData(
  view: RankingView,
  opts: { category?: string } = {},
): Promise<LeaderboardData> {
  const { sites, slots, usingDummyData } = await loadRaw();

  const scoped = opts.category
    ? sites.filter((s) => s.category === opts.category)
    : sites;

  // Only rank sites with traffic in the relevant window: momentum is "who's
  // growing right now", so a site with 0 clicks this week has no momentum story
  // (and showing "-100% · 0 clicks" reads as broken). Such a site can still
  // appear on the volume board if it has 28-day clicks.
  const withTraffic = scoped.filter((s) =>
    view === "volume" ? s.clicks_28d > 0 : s.clicks_7d > 0,
  );

  const organic = rankSites(withTraffic, view);
  const rows = injectSponsored(organic, slots);

  const totalClicks28d = scoped.reduce(
    (sum, s) => (s.is_active ? sum + s.clicks_28d : sum),
    0,
  );

  const counts = {
    momentum: scoped.filter((s) => s.is_active && s.clicks_7d > 0).length,
    volume: scoped.filter((s) => s.is_active && s.clicks_28d > 0).length,
  };

  // Founding status is program-wide (all active sites), not category-scoped.
  const founding = computeFounding(sites);

  return {
    rows,
    organic,
    sponsored: slots,
    lastUpdated: latestRefresh(scoped),
    totalSites: organic.length,
    totalClicks28d,
    counts,
    founding,
    usingDummyData,
  };
}

/**
 * Raw active sites from the same source as the leaderboard (Supabase or seed).
 * Used by the stats page so both surfaces agree on the underlying data.
 */
export async function getActiveSites(): Promise<{
  sites: PublishedSite[];
  usingDummyData: boolean;
}> {
  const { sites, usingDummyData } = await loadRaw();
  return { sites: sites.filter((s) => s.is_active), usingDummyData };
}

/** Founding-program status (spots claimed/left), for the /founding page. */
export async function getFoundingInfo(): Promise<FoundingInfo> {
  const { sites } = await getActiveSites();
  return computeFounding(sites);
}

/**
 * Attach a compact recent daily-click series to each organic row for the inline
 * sparkline. One batched query for all visible rows (call it on a single page's
 * rows, not the whole board). Falls back to a synthetic series in preview mode.
 */
export async function attachSparklines(
  rows: LeaderboardRow[],
  days = 21,
): Promise<LeaderboardRow[]> {
  const organic = rows.filter((r): r is RankedSite => r.kind === "organic");
  if (organic.length === 0) return rows;

  const map = new Map<string, number[]>();

  if (!isSupabaseConfigured()) {
    for (const s of organic) map.set(s.id, synthSpark(s.clicks7d, s.clicks28d, days));
  } else {
    try {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - days);
      const supabase = createServiceClient();
      const { data, error } = await supabase
        .from("site_click_history")
        .select("site_id, date, clicks")
        .in("site_id", organic.map((s) => s.id))
        .gte("date", since.toISOString().slice(0, 10))
        .order("date", { ascending: true });
      if (error) throw error;
      for (const r of data ?? []) {
        const arr = map.get(r.site_id) ?? [];
        arr.push(r.clicks);
        map.set(r.site_id, arr);
      }
    } catch (err) {
      console.error("[data] sparkline read failed:", err);
    }
  }

  return rows.map((r) =>
    r.kind === "organic" ? { ...r, spark: map.get(r.id) ?? [] } : r,
  );
}

/** Preview-only compact series from a site's totals. Never used live. */
function synthSpark(clicks7d: number, clicks28d: number, days: number): number[] {
  const dailyRecent = clicks7d / 7;
  const dailyPrev = Math.max(clicks28d - clicks7d, 0) / 21;
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const base = i < 7 ? dailyRecent : dailyPrev;
    const wobble = 1 + 0.18 * Math.sin(i * 1.3);
    out.push(Math.max(0, Math.round(base * wobble)));
  }
  return out;
}

export interface SiteTraffic {
  visitors: number;
  sessions: number;
  pageviews: number;
}

/**
 * All-time first-party traffic totals for RealRank itself (visitors, sessions,
 * pageviews), summed from the daily counter. Powers the homepage activity pill.
 * Returns zeros gracefully when Supabase isn't configured or on any error —
 * traffic display must never break the page.
 */
export async function getSiteTraffic(): Promise<SiteTraffic> {
  const empty: SiteTraffic = { visitors: 0, sessions: 0, pageviews: 0 };
  if (!isSupabaseConfigured()) return empty;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("site_traffic_daily")
      .select("visitors, sessions, pageviews");
    if (error) throw error;
    return (data ?? []).reduce<SiteTraffic>(
      (acc, r) => ({
        visitors: acc.visitors + Number(r.visitors),
        sessions: acc.sessions + Number(r.sessions),
        pageviews: acc.pageviews + Number(r.pageviews),
      }),
      empty,
    );
  } catch (err) {
    console.error("[data] traffic read failed:", err);
    return empty;
  }
}

export interface TrafficDay {
  day: string; // YYYY-MM-DD
  visitors: number;
  sessions: number;
  pageviews: number;
}

/**
 * Daily first-party traffic rows for the last `days` (ascending) — for the
 * traffic trend chart on /stats. Empty when unconfigured or on error.
 */
export async function getSiteTrafficSeries(days = 30): Promise<TrafficDay[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("site_traffic_daily")
      .select("day, visitors, sessions, pageviews")
      .gte("day", since.toISOString().slice(0, 10))
      .order("day", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      day: r.day,
      visitors: Number(r.visitors),
      sessions: Number(r.sessions),
      pageviews: Number(r.pageviews),
    }));
  } catch (err) {
    console.error("[data] traffic series read failed:", err);
    return [];
  }
}

export interface MoversData {
  /** Sites that gained rank since the previous refresh (largest gain first). */
  climbers: RankedSite[];
  /** Sites that lost rank since the previous refresh (largest drop first). */
  fallers: RankedSite[];
  /** New entrants this period (had no prior momentum score). */
  newcomers: RankedSite[];
  weekOf: string | null;
  totalSites: number;
  usingDummyData: boolean;
}

/**
 * Week-over-week movement on the momentum board — the "who's heating up right
 * now" story. Reuses the same ranking (and its per-site rankDelta) as the main
 * leaderboard so the numbers always agree. Momentum-only: it *is* the growth view.
 */
export async function getMovers(limit = 5): Promise<MoversData> {
  const { sites, usingDummyData } = await loadRaw();
  // Same universe as the momentum board: active sites with clicks this week.
  const withTraffic = sites.filter((s) => s.is_active && s.clicks_7d > 0);
  const ranked = rankSites(withTraffic, "momentum");

  const climbers = ranked
    .filter((s) => s.rankDelta !== null && s.rankDelta > 0)
    .sort((a, b) => (b.rankDelta ?? 0) - (a.rankDelta ?? 0))
    .slice(0, limit);

  const fallers = ranked
    .filter((s) => s.rankDelta !== null && s.rankDelta < 0)
    .sort((a, b) => (a.rankDelta ?? 0) - (b.rankDelta ?? 0))
    .slice(0, limit);

  // New entrants worth celebrating: no prior score, but a real foothold now.
  const newcomers = ranked
    .filter((s) => s.rankDelta === null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);

  return {
    climbers,
    fallers,
    newcomers,
    weekOf: latestRefresh(sites),
    totalSites: ranked.length,
    usingDummyData,
  };
}

export interface RecentSite {
  displayName: string;
  host: string;
}

/** Newest active sites, for the "recently joined" liveness strip on the home page. */
export async function getRecentlyJoined(limit = 6): Promise<RecentSite[]> {
  try {
    const { sites } = await getActiveSites();
    return [...sites]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit)
      .map((s) => ({
        displayName: s.display_name,
        host: hostname(s.site_url).toLowerCase(),
      }));
  } catch {
    return [];
  }
}

/**
 * Cross-request cache of the active board (published sites + sponsored slots).
 * The home page is dynamic, so without this every visit would hit Supabase;
 * caching it makes the common case near-instant TTFB. Refreshes at most hourly
 * (matching the refresh cron) and is busted immediately on any write via
 * `revalidateTag(LEADERBOARD_TAG)`. Errors are NOT cached — they throw so the
 * caller falls back for that request only and the next request retries.
 */
export const LEADERBOARD_TAG = "leaderboard";

const readBoardRaw = unstable_cache(
  async (): Promise<{ sites: PublishedSite[]; slots: SponsoredSlot[] }> => {
    const supabase = createServiceClient();
    const [sitesRes, slotsRes] = await Promise.all([
      supabase.from("published_sites").select("*").eq("is_active", true),
      supabase.from("sponsored_slots").select("*").eq("is_active", true),
    ]);
    if (sitesRes.error) throw sitesRes.error;
    if (slotsRes.error) throw slotsRes.error;
    return { sites: sitesRes.data ?? [], slots: slotsRes.data ?? [] };
  },
  ["board-raw-v1"],
  { revalidate: 3600, tags: [LEADERBOARD_TAG] },
);

// Per-request memoized on top of the cross-request cache: the home page derives
// the board, movers, and "recently joined" from the same read — `cache`
// collapses those to ONE call per render instead of three.
const loadRaw = cache(async function loadRaw(): Promise<{
  sites: PublishedSite[];
  slots: SponsoredSlot[];
  usingDummyData: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return { sites: DUMMY_SITES, slots: DUMMY_SPONSORED, usingDummyData: true };
  }

  try {
    // Supabase is connected: always show real data, never seed data — even when
    // the table is empty (the UI renders a proper empty state instead).
    const { sites, slots } = await readBoardRaw();
    return { sites, slots, usingDummyData: false };
  } catch (err) {
    console.error("[data] Supabase read failed:", err);
    // Don't fall back to seed data on the live site — surface an empty board.
    return { sites: [], slots: [], usingDummyData: false };
  }
});
