import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Prose } from "@/components/prose";
import { Leaderboard } from "@/components/leaderboard";
import { getLeaderboardData, attachSparklines } from "@/lib/data";
import { categories, categoryLabel, siteConfig } from "@/lib/config";
import { formatCompact } from "@/lib/utils";

export const revalidate = 3600;

type Params = Promise<{ category: string }>;

// A ranking needs a few real entries to be worth indexing — below this the page
// is noindex'd (and left out of the sitemap), and flips to indexable on its own
// as more sites in the category connect Search Console.
const MIN_RANKED = 3;

const VALID = new Set<string>(categories.map((c) => c.slug));

export async function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  if (!VALID.has(category)) return { title: "Not found", robots: { index: false, follow: false } };
  const label = categoryLabel(category);
  const data = await getLeaderboardData("momentum", { category: category as (typeof categories)[number]["slug"] });
  const thin = data.organic.length < MIN_RANKED;
  const title = `Fastest-growing ${label} websites by organic traffic (2026)`;
  return {
    title,
    description: `A live, verified ranking of the fastest-growing ${label} websites by organic search traffic — measured from Google Search Console, sorted by momentum, not estimates.`,
    alternates: { canonical: `/best/fastest-growing/${category}` },
    keywords: [`fastest growing ${label}`, `${label} organic traffic`, `${label} leaderboard`, "SEO growth", "verified traffic"],
    openGraph: { title, url: `${siteConfig.url}/best/fastest-growing/${category}` },
    ...(thin ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function FastestGrowingCategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  if (!VALID.has(category)) notFound();
  const label = categoryLabel(category);

  const data = await getLeaderboardData("momentum", { category: category as (typeof categories)[number]["slug"] });
  const rows = await attachSparklines(data.rows);

  const faq = [
    {
      q: `How is "fastest-growing" measured?`,
      a: "By momentum: each site's average daily organic clicks over the last 7 days versus the prior 21, weighted logarithmically by volume so real growth beats both statistical noise and sheer size.",
    },
    {
      q: "Where does the data come from?",
      a: "Directly from each site's Google Search Console via a read-only connection — actual organic clicks, not modelled estimates like SimilarWeb.",
    },
    {
      q: `How do I get my ${label} site on this list?`,
      a: `Connect Google Search Console, publish your verified property, and set its category to ${label}. It's free and updates automatically.`,
    },
  ];

  const jsonLd = {
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-3xl">
        <h1 className="text-balance text-4xl font-bold tracking-tight">
          Fastest-growing {label} websites by organic traffic
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Most &quot;top {label}&quot; lists are guesswork — third-party estimates, or whoever bought
          the ad. This one is different: every site below has connected Google Search Console, so the
          organic click numbers are <strong>verified</strong>, and the order is set by{" "}
          <Link href="/about">momentum</Link> — how fast each is actually growing.
        </p>
      </div>

      <Prose className="mt-8 max-w-3xl">
        <h2>Why momentum, not size</h2>
        <p>
          Ranking {label} purely by total traffic just re-lists the incumbents you already know.
          Momentum surfaces the ones on a tear right now — the ones worth watching, partnering with,
          or benchmarking against. A tiny tool doubling its clicks can rank above a household name
          that&apos;s plateaued, while a log-of-volume weight stops pure noise from topping the chart.
        </p>
      </Prose>

      <div className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">The live ranking</h2>
          <span className="text-sm text-muted-foreground">
            {formatCompact(data.totalSites)} {label} sites
          </span>
        </div>
        {data.organic.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            No verified {label} sites yet —{" "}
            <Link href="/login" className="text-primary hover:underline">be the first</Link>.
          </div>
        ) : (
          <Leaderboard rows={rows} view="momentum" />
        )}
      </div>

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

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/login">Add your {label} site — verified &amp; free</Link>
        </Button>
        <Link
          href={`/category/${category}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          See the full {label} leaderboard →
        </Link>
      </div>
    </div>
  );
}
