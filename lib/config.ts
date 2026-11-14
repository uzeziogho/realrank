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

/**
 * Structured listing fields — small, filterable vocabularies. Defined here (not
 * in the server-only lib/listed) so the submit + edit forms can import them.
 */
export const PRICING_OPTIONS = ["free", "freemium", "paid", "open_source"] as const;
export const PLATFORM_OPTIONS = ["web", "ios", "android", "mac", "windows", "api", "cli"] as const;
export const PRICING_LABELS: Record<string, string> = {
  free: "Free",
  freemium: "Freemium",
  paid: "Paid",
  open_source: "Open source",
};
export const PLATFORM_LABELS: Record<string, string> = {
  web: "Web",
  ios: "iOS",
  android: "Android",
  mac: "Mac",
  windows: "Windows",
  api: "API",
  cli: "CLI",
};

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

/** Places to browse: the ranked board sliced different ways + the directory. Header "Boards" menu. */
export const boardLinks: NavLink[] = [
  {
    href: "/leaderboard",
    label: "Leaderboard",
    description: "Every verified site, ranked by organic momentum.",
  },
  {
    href: "/best/fastest-growing",
    label: "Fastest-growing websites",
    description: "This month's top movers across every category.",
  },
  {
    href: "/movers",
    label: "Weekly movers",
    description: "The week's biggest climbs and falls.",
  },
  {
    href: "/listed",
    label: "Directory",
    description: "Browse every listed project — open and free to join.",
  },
  {
    href: "/stats",
    label: "RealRank Index",
    description: "Is organic search growing? The verified benchmark.",
  },
  {
    href: "/founding",
    label: "Founding sites",
    description: "The first 50 verified sites, with a permanent badge.",
  },
];

/**
 * Everything a maker can do to get on RealRank, in the order they usually do
 * it. Header "For makers" menu + the top of the mobile menu.
 */
export const makerLinks: NavLink[] = [
  {
    href: "/submit",
    label: "List your project",
    description: "Free and permanent. No account needed.",
  },
  {
    href: "/login",
    label: "Get a verified rank",
    description: "Connect Search Console (read-only) — free.",
  },
  {
    href: "/spotlight",
    label: "Book a Spotlight",
    description: "7 days at the top of the directory. Labelled, never affects rank.",
  },
  {
    href: "/pricing",
    label: "Pricing",
    description: "Listing and ranking are free. What money can and can't buy.",
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
    href: "/state-of-indie-organic-traffic",
    label: "State of Indie Traffic",
    description: "A verified benchmark of indie organic traffic — free to cite.",
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
    href: "/best/fastest-growing/saas",
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
