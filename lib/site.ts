import "server-only";

import { getActiveSites } from "@/lib/data";
import { rankSites, latestRefresh } from "@/lib/ranking";
import { hostname } from "@/lib/utils";
import type { RankedSite } from "@/lib/types";

export interface SiteProfile {
  site: RankedSite; // momentum-ranked entry (rank, delta, momentum, clicks…)
  volumeRank: number;
  totalSites: number;
  lastUpdated: string | null;
  usingDummyData: boolean;
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

  return {
    site,
    volumeRank,
    totalSites: momentum.length,
    lastUpdated: latestRefresh(sites),
    usingDummyData,
  };
}

/** All active site slugs — used for the sitemap and static params. */
export async function getAllSiteSlugs(): Promise<string[]> {
  const { sites } = await getActiveSites();
  return Array.from(new Set(sites.map((s) => siteSlug(s.site_url))));
}
