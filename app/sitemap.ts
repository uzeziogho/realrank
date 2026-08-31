import type { MetadataRoute } from "next";
import { siteConfig, categories } from "@/lib/config";
import { getAllSiteSlugs } from "@/lib/site";
import { articles } from "@/lib/articles";

const LANDING_PAGES = ["lol-directories", "fastest-growing-saas-websites"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = siteConfig.url;

  // Per-site profile pages (crawlable SEO surface). Capped for very large sets.
  let siteSlugs: string[] = [];
  try {
    siteSlugs = (await getAllSiteSlugs()).slice(0, 5000);
  } catch {
    siteSlugs = [];
  }

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${base}/?view=momentum`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${base}/stats`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${base}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...categories.map((c) => ({
      url: `${base}/category/${c.slug}`,
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
    ...LANDING_PAGES.map((slug) => ({
      url: `${base}/best/${slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
