import type { MetadataRoute } from "next";
import { siteConfig, categories } from "@/lib/config";
import { getAllSiteSlugs } from "@/lib/site";

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
      url: `${base}/?view=volume`,
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
  ];
}
