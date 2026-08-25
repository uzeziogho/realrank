import "server-only";

import type { PublishedSite, SponsoredSlot } from "@/lib/supabase/types";
import { DUMMY_SITES, DUMMY_SPONSORED } from "@/lib/dummy-data";
import { rankSites, injectSponsored, latestRefresh } from "@/lib/ranking";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import type { LeaderboardRow, RankedSite, RankingView } from "@/lib/types";

export interface LeaderboardData {
  rows: LeaderboardRow[];
  organic: RankedSite[];
  /** Active sponsored slots, so callers can re-inject ads per paginated page. */
  sponsored: SponsoredSlot[];
  lastUpdated: string | null;
  totalSites: number;
  totalClicks28d: number;
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

  const organic = rankSites(scoped, view);
  const rows = injectSponsored(organic, slots);

  const totalClicks28d = scoped.reduce(
    (sum, s) => (s.is_active ? sum + s.clicks_28d : sum),
    0,
  );

  return {
    rows,
    organic,
    sponsored: slots,
    lastUpdated: latestRefresh(scoped),
    totalSites: organic.length,
    totalClicks28d,
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

    const sites = sitesRes.data ?? [];
    // If the table is empty (fresh project), fall back to seed data.
    if (sites.length === 0) {
      return { sites: DUMMY_SITES, slots: DUMMY_SPONSORED, usingDummyData: true };
    }

    return {
      sites,
      slots: slotsRes.data ?? [],
      usingDummyData: false,
    };
  } catch (err) {
    console.error("[data] Supabase read failed, using seed data:", err);
    return { sites: DUMMY_SITES, slots: DUMMY_SPONSORED, usingDummyData: true };
  }
}
