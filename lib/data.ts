import "server-only";

import type { PublishedSite, SponsoredSlot } from "@/lib/supabase/types";
import { DUMMY_SITES, DUMMY_SPONSORED } from "@/lib/dummy-data";
import { rankSites, injectSponsored, latestRefresh } from "@/lib/ranking";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import { hostname } from "@/lib/utils";
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
  usingDummyData: boolean;
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

  return {
    rows,
    organic,
    sponsored: slots,
    lastUpdated: latestRefresh(scoped),
    totalSites: organic.length,
    totalClicks28d,
    counts,
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

async function loadRaw(): Promise<{
  sites: PublishedSite[];
  slots: SponsoredSlot[];
  usingDummyData: boolean;
}> {
  if (!isSupabaseConfigured()) {
    return { sites: DUMMY_SITES, slots: DUMMY_SPONSORED, usingDummyData: true };
  }

  try {
    const supabase = createServiceClient();
    const [sitesRes, slotsRes] = await Promise.all([
      supabase.from("published_sites").select("*").eq("is_active", true),
      supabase.from("sponsored_slots").select("*").eq("is_active", true),
    ]);

    if (sitesRes.error) throw sitesRes.error;

    // Supabase is connected: always show real data, never seed data — even when
    // the table is empty (the UI renders a proper empty state instead).
    return {
      sites: sitesRes.data ?? [],
      slots: slotsRes.data ?? [],
      usingDummyData: false,
    };
  } catch (err) {
    console.error("[data] Supabase read failed:", err);
    // Don't fall back to seed data on the live site — surface an empty board.
    return { sites: [], slots: [], usingDummyData: false };
  }
}
