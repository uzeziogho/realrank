/**
 * Central brand + product configuration.
 * Rename here to rebrand the entire app (name, tagline, domain, categories).
 */
/**
 * Resolve the public site URL robustly. Handles an unset OR empty
 * NEXT_PUBLIC_SITE_URL (a blank value would otherwise make `new URL()` throw
 * during the build), then falls back to the production domain, then localhost.
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

  // On Vercel (server), default to the real custom domain so canonical tags, the
  // sitemap, and OAuth redirects are correct without needing an env var.
  if (process.env.VERCEL) return PRODUCTION_URL;

  // Client bundles can't see VERCEL (only NEXT_PUBLIC_* and NODE_ENV are inlined
  // in the browser), so a client-rendered URL — e.g. the listing badge — would
  // otherwise fall through to localhost in production. NODE_ENV is inlined on
  // both server and client, so key the production default off it too.
  if (process.env.NODE_ENV === "production") return PRODUCTION_URL;

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
  twitter: "@biznessbud",
  // Google Search Console "HTML tag" verification token (optional). See above.
  googleSiteVerification: GOOGLE_SITE_VERIFICATION,
  // How often the public data is refreshed by the cron job (used in copy only).
  // Matches vercel.json (daily on Hobby; raise cadence + this value on Pro).
  refreshCadenceHours: 24,
  // Founding program: the first N sites to connect become founding members
  // (permanent Founder badge). Powers the /founding recruitment page + scarcity.
  foundingSpots: 50,
  /**
   * Published contact addresses. Every one of these is printed on a public page
   * (and so will be scraped), and mail to them must actually arrive: `privacy`
   * is what the privacy policy promises for data requests, and `support` is
   * what the pricing page gives sponsors. They don't need separate mailboxes —
   * aliases forwarding to one inbox, plus a catch-all so nothing bounces, is
   * enough at this size.
   *
   * `sponsors` deliberately points at `support` until a sponsors@ alias exists.
   * Publishing an address before it can receive mail just bounces the offers
   * this is meant to catch, and a push here reaches the live domain, so flip it
   * to "sponsors@realrank.lol" in this one place once the alias is live.
   */
  email: {
    support: "support@realrank.lol",
    privacy: "privacy@realrank.lol",
    sponsors: "support@realrank.lol",
  },
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

/**
 * Flat top-level links in the header, kept to the two flagship destinations so
 * the bar stays uncrowded. Everything else lives under the grouped header menus
 * (Boards, Tools, Learn) and the mobile menu.
 */
export const primaryNav: NavLink[] = [
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/stats", label: "Stats" },
];

/** The leaderboard sliced different ways. Header "Boards" menu. */
export const boardLinks: NavLink[] = [
  {
    href: "/submit",
    label: "List your project",
    description: "Add your project free — no login, permanent link.",
  },
  {
    href: "/listed",
    label: "Directory",
    description: "Browse every listed project.",
  },
  {
    href: "/founding",
    label: "Founding sites",
    description: "The first 50 sites, with a permanent badge.",
  },
];

/**
 * Free, no-login tools. These run on numbers you type in, so a logged-out
 * visitor can use them immediately. Header "Tools" menu (free section).
 */
export const toolLinks: NavLink[] = [
  {
    href: "/report-card",
    label: "Traffic report card",
    description: "Grade any domain's verified organic traffic. Instant and shareable.",
  },
  {
    href: "/momentum-score",
    label: "Momentum calculator",
    description: "Score and grade your growth from your 7- and 28-day clicks.",
  },
  {
    href: "/is-my-traffic-real",
    label: "Is my traffic real?",
    description: "Check whether your traffic is genuine organic search demand.",
  },
];

/**
 * Tools that read your Search Console, so they need a connected account. Kept
 * separate from the free tools so a logged-out click never dead-ends at a login
 * wall. Header "Tools" menu (members section).
 */
export const memberLinks: NavLink[] = [
  {
    href: "/dashboard/leaks",
    label: "Search leaks",
    description: "Find where organic clicks leak before reaching your site.",
  },
  {
    href: "/dashboard/channels",
    label: "Channels",
    description: "Track which marketing channels bring paying customers.",
  },
];

/** Learn/marketing pages. Header "Learn" menu. */
export const learnLinks: NavLink[] = [
  {
    href: "/about",
    label: "How it works",
    description: "How momentum ranking and verified traffic work.",
  },
  {
    href: "/agent-visibility",
    label: "Agent visibility",
    description: "Make your verified rank queryable by AI agents.",
  },
  {
    href: "/blog",
    label: "Blog",
    description: "Essays on verified organic traffic and growth.",
  },
];

/** Guides and curated rankings, evergreen landing pages. */
export const guideLinks: NavLink[] = [
  {
    href: "/best/fastest-growing-saas-websites",
    label: "Fastest-growing SaaS",
    description: "A live ranking of SaaS sites by verified organic momentum.",
  },
  {
    href: "/best/lol-directories",
    label: "Best .lol directories",
    description: "The .lol leaderboards compared, and which to trust.",
  },
];

/**
 * Don't put a visit count on a public page below this. A listing showing
 * "2 visits" reads as proof the listing is worthless — worse than showing
 * nothing — and single-digit counts are noise anyway: one curious visitor, or
 * the owner checking their own listing. Above it the number is social proof
 * that cuts both ways honestly. Counts come from getOutboundClicks (lib/data).
 */
export const VISITS_FLOOR = 10;
