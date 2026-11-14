import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Prose } from "@/components/prose";
import { Leaderboard } from "@/components/leaderboard";
import { LeaderboardJsonLd } from "@/components/json-ld";
import { getLeaderboardData, attachSparklines } from "@/lib/data";
import { categories, siteConfig } from "@/lib/config";
import { MIN_RANKED_FOR_CATEGORY, rankedOnly } from "@/lib/indexing";
import { formatCompact, formatGrowth, timeAgo } from "@/lib/utils";

export const revalidate = 3600;

/** How many sites the hub lists; the full board lives at /leaderboard. */
const TOP_N = 25;

/** Per-category pages index at this many board entries (mirrors their own guard). */
const MIN_FOR_CATEGORY_PAGE = 3;

/** "November 2026" — keeps the title fresh for a query people search monthly. */
function monthLabel(): string {
  return new Date().toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getLeaderboardData("momentum");
  // Same bar as a category board: a "fastest-growing" list of one or two sites
  // isn't a ranking. The sitemap applies the same rule.
  const thin = rankedOnly(data.organic).length < MIN_RANKED_FOR_CATEGORY;
  const title = `Fastest-growing websites (${monthLabel()}), verified`;
  const description =
    "The fastest-growing websites right now, ranked by verified Google Search Console clicks — not estimates. Updated daily, sorted by momentum, so a small site on a tear can outrank a giant.";
  return {
    title,
    description,
    alternates: { canonical: "/best/fastest-growing" },
    keywords: [
      "fastest growing websites",
      "top growing websites",
      "fastest growing sites",
      "trending websites",
      "website traffic growth",
      "verified organic traffic",
    ],
    openGraph: { title, description, url: `${siteConfig.url}/best/fastest-growing` },
    ...(thin ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function FastestGrowingPage() {
  const data = await getLeaderboardData("momentum");
  const ranked = rankedOnly(data.organic);
  const top = ranked.slice(0, TOP_N);
  const rows = await attachSparklines(top);
  const leader = top[0] ?? null;
  const growing = ranked.filter((s) => s.growthRate > 0).length;

  // Category drill-downs that are full enough to be real pages.
  const counts = new Map<string, number>();
  for (const s of data.organic) if (s.category) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  const categoryLinks = categories.filter((c) => (counts.get(c.slug) ?? 0) >= MIN_FOR_CATEGORY_PAGE);

  const faq = [
    {
      q: "What are the fastest-growing websites right now?",
      a: leader
        ? `As of this update, ${leader.displayName} leads with ${formatGrowth(leader.growthRate)} organic clicks week over week. The full list above is re-ranked daily from verified Google Search Console data.`
        : "The list above is re-ranked daily from verified Google Search Console data.",
    },
    {
      q: "How is “fastest-growing” measured?",
      a: "By momentum: each site's average daily organic clicks over the last 7 days versus the prior 21, weighted by the log of its volume — so real growth beats both statistical noise and sheer size.",
    },
    {
      q: "Is this traffic data estimated?",
      a: "No. Every site here connected Google Search Console with read-only access, so the clicks are Google's own measured numbers — not a clickstream-panel estimate like SimilarWeb or Ahrefs traffic.",
    },
    {
      q: "Can I pay to appear on this list?",
      a: "No. Rank comes only from verified growth. Sponsored placements elsewhere on RealRank are always labelled and never change the order.",
    },
    {
      q: "How do I get my website on the list?",
      a: "Connect Google Search Console (read-only, about 30 seconds). Your site is ranked on the next refresh — free.",
    },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="container max-w-4xl py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <LeaderboardJsonLd sites={top} />

      <div className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {monthLabel()} · updated {data.lastUpdated ? timeAgo(data.lastUpdated) : "daily"}
        </p>
        <h1 className="mt-2 text-balance text-4xl font-bold tracking-tight">
          The fastest-growing websites, by verified organic traffic
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Most &quot;top growing websites&quot; lists are third-party estimates or whoever paid to be
          on them. Every site below connected Google Search Console, so its organic clicks are{" "}
          <strong>measured, not guessed</strong> — and the order is set by{" "}
          <Link href="/about" className="text-primary hover:underline">momentum</Link>: how fast each one is growing right now.
        </p>
        {ranked.length > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            {formatCompact(ranked.length)} verified sites ranked · {formatCompact(growing)} growing this week
            {leader && (
              <>
                {" "}
                · #1 is <strong className="text-foreground">{leader.displayName}</strong> at{" "}
                <span className="font-semibold text-success">{formatGrowth(leader.growthRate)}</span>
              </>
            )}
          </p>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Top {Math.min(TOP_N, top.length) || TOP_N} right now</h2>
          <Link href="/leaderboard" className="text-sm text-primary hover:underline">
            Full leaderboard →
          </Link>
        </div>
        {top.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            No verified sites ranked yet —{" "}
            <Link href="/login" className="text-primary hover:underline">be the first</Link>.
          </div>
        ) : (
          <Leaderboard rows={rows} view="momentum" foundingCutoff={data.founding.cutoff} />
        )}
      </div>

      {categoryLinks.length > 0 && (
        <nav className="mt-10" aria-label="Fastest-growing by category">
          <h2 className="text-xl font-semibold tracking-tight">Fastest-growing by category</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {categoryLinks.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/best/fastest-growing/${c.slug}`}
                  className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  Fastest-growing {c.label} sites
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <Prose className="mt-10 max-w-3xl">
        <h2>Why momentum, not size</h2>
        <p>
          Ranking websites by total traffic just re-lists the giants everyone already knows.
          Momentum asks a more useful question — <em>who is growing fastest right now?</em> — so a
          small site that doubled its search clicks this week can sit above a household name that
          has plateaued. A log-of-volume weight stops a jump from 2 clicks to 6 from topping the
          chart.
        </p>
        <h2>Why verified beats estimated</h2>
        <p>
          Traffic estimators model the web from a sample of browsing data. For big sites that is
          directional; for the small and fast-growing sites this list is about, the sample barely
          sees them, so estimates routinely miss by a wide margin. Here, every number comes from
          the site&apos;s own Search Console, connected read-only. See{" "}
          <Link href="/blog/verified-vs-estimated-traffic">verified vs estimated traffic</Link> and
          the <Link href="/stats">RealRank Index</Link> for how organic search is trending overall.
        </p>
      </Prose>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
        <dl className="mt-4 space-y-6">
          {faq.map((f) => (
            <div key={f.q}>
              <dt className="font-medium text-foreground">{f.q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/login">Get a verified rank — free</Link>
        </Button>
        <Link href="/movers" className="text-sm font-medium text-primary hover:underline">
          This week&apos;s biggest movers →
        </Link>
      </div>
    </div>
  );
}
