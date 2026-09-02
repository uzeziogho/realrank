import "server-only";

import { getActiveSites, computeFounding, isFounding } from "@/lib/data";
import { rankSites, latestRefresh } from "@/lib/ranking";
import { hostname } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import type { RankedSite } from "@/lib/types";

export interface DailyPoint {
  date: string; // YYYY-MM-DD
  clicks: number;
}

export interface SiteRival {
  slug: string;
  displayName: string;
  rank: number;
}

export interface SiteProfile {
  site: RankedSite; // momentum-ranked entry (rank, delta, momentum, clicks…)
  volumeRank: number;
  totalSites: number;
  lastUpdated: string | null;
  usingDummyData: boolean;
  /** Daily organic-click history (ascending). Empty until the first refresh. */
  history: DailyPoint[];
  /** The site directly ahead by momentum (or just behind, for #1) — for the compare CTA. */
  rival: SiteRival | null;
  /** Whether this site is a founding member (one of the first to join). */
  founding: boolean;
}

/** Slug used in /site/[slug] URLs: the clean hostname, lowercased. */
export function siteSlug(siteUrl: string): string {
  return hostname(siteUrl).toLowerCase();
}

export async function getSiteProfileBySlug(slug: string): Promise<SiteProfile | null> {
  const target = decodeURIComponent(slug).toLowerCase().replace(/^www\./, "");
  const { sites, usingDummyData } = await getActiveSites();
  if (sites.length === 0) return null;

  const momentum = rankSites(sites, "momentum");
  const volume = rankSites(sites, "volume");

  const site = momentum.find((s) => siteSlug(s.siteUrl) === target);
  if (!site) return null;

  const volumeRank = volume.find((s) => s.id === site.id)?.rank ?? site.rank;

  // Compare target: the site directly ahead by momentum; for #1, the runner-up.
  const idx = momentum.findIndex((s) => s.id === site.id);
  const rivalSite = idx > 0 ? momentum[idx - 1] : momentum[idx + 1];
  const rival: SiteRival | null = rivalSite
    ? { slug: siteSlug(rivalSite.siteUrl), displayName: rivalSite.displayName, rank: rivalSite.rank }
    : null;

  const history = usingDummyData
    ? synthHistory(site.clicks7d, site.clicks28d)
    : await getSiteHistory(site.id, 60);

  const founding = isFounding(site.createdAt, computeFounding(sites).cutoff);

  return {
    site,
    volumeRank,
    totalSites: momentum.length,
    lastUpdated: latestRefresh(sites),
    usingDummyData,
    history,
    rival,
    founding,
  };
}

/** Real daily click history for a site (most recent `days`, ascending). */
export async function getSiteHistory(siteId: string, days: number): Promise<DailyPoint[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("site_click_history")
      .select("date, clicks")
      .eq("site_id", siteId)
      .gte("date", since.toISOString().slice(0, 10))
      .order("date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({ date: r.date, clicks: r.clicks }));
  } catch (err) {
    console.error("[site] history read failed:", err);
    return [];
  }
}

/**
 * Preview-only synthetic series (used with seed data when Supabase isn't
 * configured). Deterministic, and shaped to match the site's real 7d/28d totals
 * so the timeline component is demonstrable in local dev. Never used live.
 */
function synthHistory(clicks7d: number, clicks28d: number): DailyPoint[] {
  const dailyRecent = clicks7d / 7;
  const dailyPrev = Math.max(clicks28d - clicks7d, 0) / 21;
  const out: DailyPoint[] = [];
  const today = new Date();
  today.setUTCDate(today.getUTCDate() - 3); // match GSC lag
  for (let i = 55; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const base = i < 7 ? dailyRecent : dailyPrev;
    // Deterministic gentle wobble so the line reads naturally.
    const wobble = 1 + 0.18 * Math.sin(i * 1.3);
    out.push({ date: d.toISOString().slice(0, 10), clicks: Math.max(0, Math.round(base * wobble)) });
  }
  return out;
}

/** All active site slugs — used for the sitemap and static params. */
export async function getAllSiteSlugs(): Promise<string[]> {
  const { sites } = await getActiveSites();
  return Array.from(new Set(sites.map((s) => siteSlug(s.site_url))));
}
