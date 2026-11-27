import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Signup growth for the owner: directory listings, verified sites on the
 * board, and accounts (people who connected Google). Counted from the rows
 * themselves (created_at), not from click events, so ad blockers and missed
 * beacons can't skew it. "Weeks" are rolling 7-day windows ending now, so
 * "this week" always means the last 7 days.
 */

const DAY_MS = 86_400_000;
export const GROWTH_WEEKS = 12;

export type GrowthKey = "listings" | "sites" | "accounts";

export interface GrowthSeries {
  key: GrowthKey;
  label: string;
  /** Every row ever created (including ones later removed or unpublished). */
  total: number;
  /** Rows live right now (active listings / published sites); null for accounts. */
  live: number | null;
  last7: number;
  prev7: number;
  last30: number;
  prev30: number;
  /** New rows per rolling week, oldest first; the last entry is the last 7 days. */
  weekly: number[];
}

export interface Growth {
  available: boolean;
  series: GrowthSeries[];
  /** Start date (YYYY-MM-DD) of each weekly bucket, oldest first. */
  weekStarts: string[];
  /** Live listings that proved ownership (badge or link check). */
  verifiedListings: number;
  /** Accounts that have published at least one site to the board. */
  accountsWithSite: number;
}

type Table = "listed_sites" | "published_sites" | "profiles";

/** created_at of every row since `sinceIso`, paged 1,000 at a time. */
async function createdSince(table: Table, sinceIso: string): Promise<number[]> {
  const supabase = createServiceClient();
  const out: number[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select("created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    for (const r of data ?? []) out.push(Date.parse(r.created_at));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function countRows(table: Table, filter?: (q: any) => any): Promise<number> {
  let q = createServiceClient().from(table).select("*", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

function seriesFrom(key: GrowthKey, label: string, times: number[], total: number, live: number | null, now: number): GrowthSeries {
  const within = (fromDays: number, toDays: number) =>
    times.filter((t) => t > now - fromDays * DAY_MS && t <= now - toDays * DAY_MS).length;
  const weekly = Array.from({ length: GROWTH_WEEKS }, (_, i) => {
    const w = GROWTH_WEEKS - 1 - i; // weeks ago
    return within((w + 1) * 7, w * 7);
  });
  return {
    key,
    label,
    total,
    live,
    last7: within(7, 0),
    prev7: within(14, 7),
    last30: within(30, 0),
    prev30: within(60, 30),
    weekly,
  };
}

export async function getGrowth(): Promise<Growth> {
  const empty: Growth = { available: false, series: [], weekStarts: [], verifiedListings: 0, accountsWithSite: 0 };
  if (!isSupabaseConfigured()) return empty;
  try {
    const now = Date.now();
    // Enough history for 12 weekly buckets and the 30-vs-prior-30 comparison.
    const since = new Date(now - Math.max(GROWTH_WEEKS * 7, 60) * DAY_MS).toISOString();
    const [lTimes, sTimes, aTimes, lTotal, lLive, sTotal, sLive, aTotal, verified, owners] = await Promise.all([
      createdSince("listed_sites", since),
      createdSince("published_sites", since),
      createdSince("profiles", since),
      countRows("listed_sites"),
      countRows("listed_sites", (q) => q.eq("is_active", true)),
      countRows("published_sites"),
      countRows("published_sites", (q) => q.eq("is_active", true)),
      countRows("profiles"),
      countRows("listed_sites", (q) => q.eq("is_active", true).eq("owner_verified", true)),
      createServiceClient().from("published_sites").select("user_id"),
    ]);
    if (owners.error) throw owners.error;

    return {
      available: true,
      series: [
        seriesFrom("listings", "Directory listings", lTimes, lTotal, lLive, now),
        seriesFrom("sites", "Verified sites (board)", sTimes, sTotal, sLive, now),
        seriesFrom("accounts", "Accounts (Google connected)", aTimes, aTotal, null, now),
      ],
      weekStarts: Array.from({ length: GROWTH_WEEKS }, (_, i) =>
        new Date(now - (GROWTH_WEEKS - i) * 7 * DAY_MS).toISOString().slice(0, 10),
      ),
      verifiedListings: verified,
      accountsWithSite: new Set((owners.data ?? []).map((r) => r.user_id)).size,
    };
  } catch (err) {
    console.error("[growth] read failed:", err);
    return empty;
  }
}

/** Just the last-7-days counts, for the dashboard's admin panel. */
export async function getGrowthSummary(): Promise<{ listings: number; sites: number; accounts: number } | null> {
  const g = await getGrowth();
  if (!g.available) return null;
  const by = (k: GrowthKey) => g.series.find((s) => s.key === k)!.last7;
  return { listings: by("listings"), sites: by("sites"), accounts: by("accounts") };
}
