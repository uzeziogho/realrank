/**
 * Central brand + product configuration.
 * Rename here to rebrand the entire app (name, tagline, domain, categories).
 */
export const siteConfig = {
  name: "OrganicRank",
  // Keyword-forward tagline — targets "organic traffic" + "leaderboard" search intent.
  tagline: "Connect your sites. We verify the clicks. Real growth decides the order.",
  description:
    "The public organic traffic leaderboard. Sites ranked by verified Google Search Console clicks — momentum-first, so fast-growing sites can beat the giants.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ogImage: "/og.png",
  twitter: "@organicrank",
  // How often the public data is refreshed by the cron job (used in copy only).
  refreshCadenceHours: 6,
} as const;

/**
 * Category taxonomy. Each becomes a crawlable /category/[slug] page in the sitemap.
 */
export const categories = [
  { slug: "saas", label: "SaaS" },
  { slug: "ecommerce", label: "E-commerce" },
  { slug: "media", label: "Media & Blogs" },
  { slug: "developer-tools", label: "Developer Tools" },
  { slug: "ai", label: "AI" },
  { slug: "finance", label: "Finance" },
  { slug: "marketplace", label: "Marketplace" },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];

export function categoryLabel(slug: string): string {
  return categories.find((c) => c.slug === slug)?.label ?? "Other";
}

export type RankingView = "momentum" | "volume";
