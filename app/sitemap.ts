import type { MetadataRoute } from "next";
import { siteConfig, categories } from "@/lib/config";
import { getAllSiteSlugs } from "@/lib/site";
import { getListedSites, getAlternativeTargets } from "@/lib/listed";
import { getLeaderboardData } from "@/lib/data";
import { articles } from "@/lib/articles";
import {
  MIN_RANKED_FOR_CATEGORY,
  MIN_ALTERNATIVES,
  rankedCountsByCategory,
  rankedOnly,
  alternativeCounts,
  seedComparePairs,
} from "@/lib/indexing";

const LANDING_PAGES = [
  "lol-directories",
  "product-hunt-alternatives",
  "where-to-launch-your-startup",
  "free-dofollow-backlink-directories",
];

/** A fastest-growing category page needs this many ranked sites to be indexable. */
const MIN_RANKED_FOR_SITEMAP = 3;

/** A directory roundup (/best/<category>) needs this many listings to be indexable. */
const MIN_LISTED_FOR_SITEMAP = 3;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = siteConfig.url;

  // All four data reads run in parallel and each falls back to empty on failure,
  // so one slow or failing source never blocks the others — a cold sitemap fetch
  // takes as long as the slowest read, not their sum, which keeps Googlebot from
  // timing the request out ("Couldn't fetch").
  const [siteSlugs, listed, altTargets, board] = await Promise.all([
    getAllSiteSlugs()
      .then((s) => s.slice(0, 5000))
      .catch(() => [] as string[]),
    getListedSites().catch(() => [] as Awaited<ReturnType<typeof getListedSites>>),
    getAlternativeTargets().catch(() => [] as Awaited<ReturnType<typeof getAlternativeTargets>>),
    getLeaderboardData("momentum").catch(() => null),
  ]);

  // Templated pages are submitted only when they clear the same bar their own
  // metadata uses to stay indexable (lib/indexing.ts), so the sitemap never
  // lists a page that noindexes itself.
  const organic = board?.organic ?? [];
  // Head-to-heads: same-category neighbours on the board, both with data. The
  // page works for any pair on demand; only real comparisons are indexable.
  const comparePairs = seedComparePairs(organic);
  // Category boards with enough ranked sites to be a real ranking.
  const rankedByCategory = rankedCountsByCategory(organic);
  const boardCategories = categories
    .map((c) => c.slug)
    .filter((slug) => (rankedByCategory.get(slug) ?? 0) >= MIN_RANKED_FOR_CATEGORY);
  // "Top <site> alternatives" pages with enough ranked peers to list.
  const altCounts = alternativeCounts(organic);
  const alternativeSlugs = siteSlugs.filter((slug) => (altCounts.get(slug) ?? 0) >= MIN_ALTERNATIVES);

  // Only owner-verified listings are indexable, so only those go in the sitemap.
  // Count listings per category (same read) to decide which directory roundups
  // (/best/<category>) are full enough to index.
  const verifiedListedHosts = listed
    .filter((l) => l.ownerVerified)
    .map((l) => l.host)
    .slice(0, 5000);
  const listedCounts = new Map<string, number>();
  for (const l of listed) if (l.category) listedCounts.set(l.category, (listedCounts.get(l.category) ?? 0) + 1);
  const roundupCategories = categories
    .map((c) => c.slug)
    .filter((slug) => (listedCounts.get(slug) ?? 0) >= MIN_LISTED_FOR_SITEMAP);

  // "Alternative to <tool>" directory pages — one per declared target, but only
  // those with 2+ listings: a one-option "alternatives" page is thin and is
  // noindex'd at the page level, so it must stay out of the sitemap too.
  const altSlugs = altTargets
    .filter((t) => t.count >= 2)
    .map((t) => t.slug)
    .slice(0, 2000);

  // Per-category "fastest-growing" pages — only categories with enough ranked
  // sites to be a real ranking (the page noindexes itself below the same bar).
  const growingCounts = new Map<string, number>();
  for (const s of board?.organic ?? []) if (s.category) growingCounts.set(s.category, (growingCounts.get(s.category) ?? 0) + 1);
  const growingCategories = categories
    .map((c) => c.slug)
    .filter((slug) => (growingCounts.get(slug) ?? 0) >= MIN_RANKED_FOR_SITEMAP);

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${base}/leaderboard`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${base}/leaderboard?view=volume`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${base}/launches`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/listed`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${base}/submit`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/movers`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/underdogs`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${base}/founding`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${base}/stats`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${base}/stats/report`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${base}/archive`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${base}/state-of-indie-organic-traffic`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/momentum-score`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/is-my-traffic-real`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/report-card`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/agent-visibility`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...boardCategories.map((slug) => ({
      url: `${base}/category/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...siteSlugs.map((slug) => ({
      url: `${base}/site/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    // Owner-verified listings only (unverified listings are noindex).
    ...verifiedListedHosts.map((host) => ({
      url: `${base}/listed/${host}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    // "Top <site> alternatives" pages — only those with enough peers to list.
    ...alternativeSlugs.map((slug) => ({
      url: `${base}/alternatives/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    // Open directory: "alternatives to <tool>" index + one page per target.
    ...(altSlugs.length > 0
      ? [
          {
            url: `${base}/alternatives-to`,
            lastModified: now,
            changeFrequency: "daily" as const,
            priority: 0.6,
          },
        ]
      : []),
    ...altSlugs.map((slug) => ({
      url: `${base}/alternatives-to/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    {
      url: `${base}/blog`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    ...articles.map((a) => ({
      url: `${base}/blog/${a.slug}`,
      lastModified: new Date(a.updated ?? a.date),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...(rankedOnly(organic).length >= MIN_RANKED_FOR_CATEGORY
      ? [
          {
            url: `${base}/best/fastest-growing`,
            lastModified: now,
            changeFrequency: "daily" as const,
            priority: 0.8,
          },
        ]
      : []),
    ...growingCategories.map((slug) => ({
      url: `${base}/best/fastest-growing/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    // Directory roundups — one per category with enough listings to be a real
    // page (the page noindexes itself below the same bar).
    ...roundupCategories.map((slug) => ({
      url: `${base}/best/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    ...LANDING_PAGES.map((slug) => ({
      url: `${base}/best/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...comparePairs.map((slug) => ({
      url: `${base}/compare/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.5,
    })),
  ];
}
