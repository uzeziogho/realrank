/**
 * Central brand + product configuration.
 * Rename here to rebrand the entire app (name, tagline, domain, categories).
 */
/**
 * Resolve the public site URL robustly. Handles an unset OR empty
 * NEXT_PUBLIC_SITE_URL (a blank value would otherwise make `new URL()` throw
 * during the build), falling back to Vercel's deployment URL, then localhost.
 */
const PRODUCTION_URL = "https://www.realrank.lol";

/**
 * Google Search Console site-verification token (the `content` value from the
 * "HTML tag" verification method, WITHOUT the surrounding <meta> markup).
 *
 * Paste your token between the quotes below and it renders permanently into
 * every page's <head> — surviving redeploys, unlike an uploaded HTML file.
 * An env var (GOOGLE_SITE_VERIFICATION) overrides it if set. Leave blank if you
 * verified via DNS TXT instead — no meta tag is needed then.
 */
const GOOGLE_SITE_VERIFICATION =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() || "";

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  // On Vercel, default to the real custom domain so canonical tags, the sitemap,
  // and OAuth redirects are correct without needing an env var.
  if (process.env.VERCEL) return PRODUCTION_URL;

  return "http://localhost:3000";
}

export const siteConfig = {
  name: "RealRank",
  // Keyword-forward tagline — targets "organic traffic" + "leaderboard" search intent.
  tagline: "Connect your sites. We verify the clicks. Real growth decides the order.",
  description:
    "The public organic traffic leaderboard. Sites ranked by verified Google Search Console clicks — momentum-first, so fast-growing sites can beat the giants.",
  url: resolveSiteUrl(),
  ogImage: "/og.png",
  twitter: "@realrank",
  // Google Search Console "HTML tag" verification token (optional). See above.
  googleSiteVerification: GOOGLE_SITE_VERIFICATION,
  // How often the public data is refreshed by the cron job (used in copy only).
  // Matches vercel.json (daily on Hobby; raise cadence + this value on Pro).
  refreshCadenceHours: 24,
  // Founding program: the first N sites to connect become founding members
  // (permanent Founder badge). Powers the /founding recruitment page + scarcity.
  foundingSpots: 50,
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

export interface NavLink {
  href: string;
  label: string;
  /** Short blurb, shown in the header "Tools" dropdown and the mobile menu. */
  description?: string;
}

/** Primary top-level nav shown as inline links in the header. */
export const primaryNav: NavLink[] = [
  { href: "/#leaderboard", label: "Leaderboard" },
  { href: "/movers", label: "Movers" },
  { href: "/founding", label: "Founding" },
  { href: "/stats", label: "Stats" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "How it works" },
];

/**
 * Every interactive tool RealRank ships. Surfaced in the header "Tools"
 * dropdown, the mobile menu, and the footer so nothing built stays hidden.
 */
export const toolLinks: NavLink[] = [
  {
    href: "/momentum-score",
    label: "Momentum calculator",
    description: "Estimate your momentum score from your 7- and 28-day clicks.",
  },
  {
    href: "/organic-growth-grade",
    label: "Growth grader",
    description: "Get a letter grade for how fast your organic traffic is growing.",
  },
  {
    href: "/is-my-traffic-real",
    label: "Is my traffic real?",
    description: "Check whether your traffic is genuine organic search demand.",
  },
  {
    href: "/dashboard/channels",
    label: "Channels",
    description: "Track which marketing channels bring paying customers.",
  },
];

/** Guides and curated rankings — evergreen landing pages. */
export const guideLinks: NavLink[] = [
  {
    href: "/best/fastest-growing-saas-websites",
    label: "Fastest-growing SaaS",
    description: "A live ranking of SaaS sites by verified organic momentum.",
  },
  {
    href: "/best/lol-directories",
    label: "Best .lol directories",
    description: "The .lol leaderboards compared — and which to trust.",
  },
];
