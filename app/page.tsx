import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RankingToggle } from "@/components/ranking-toggle";
import { Leaderboard } from "@/components/leaderboard";
import { LeaderboardJsonLd } from "@/components/json-ld";
import { Pagination } from "@/components/pagination";
import { getLeaderboardData, attachSparklines } from "@/lib/data";
import { injectSponsored } from "@/lib/ranking";
import { siteConfig, type RankingView } from "@/lib/config";
import { formatCompact, timeAgo } from "@/lib/utils";

// Incremental Static Regeneration — full ranked list is in the initial HTML,
// refreshed at most hourly (and on-demand after the cron writes new data).
export const revalidate = 3600;

const PAGE_SIZE = 50;

type SearchParams = Promise<{ view?: string; page?: string }>;

function parseView(v?: string): RankingView {
  return v === "volume" ? "volume" : "momentum";
}

function parsePage(v: string | undefined, totalPages: number): number {
  const n = Number.parseInt(v ?? "1", 10);
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, totalPages));
}

/** Build a leaderboard URL preserving view + page params. */
function leaderboardHref(view: RankingView, page: number): string {
  const params = new URLSearchParams();
  if (view === "volume") params.set("view", "volume");
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/?${qs}#leaderboard` : "/#leaderboard";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const view = parseView(sp.view);
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const base =
    view === "volume"
      ? "Top Websites by Organic Traffic Volume"
      : "Fastest-Growing Websites by Organic Traffic";
  const title = page > 1 ? `${base} — Page ${page}` : base;

  const params = new URLSearchParams();
  if (view === "volume") params.set("view", "volume");
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();

  return {
    title,
    description: siteConfig.description,
    alternates: { canonical: qs ? `/?${qs}` : "/" },
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const view = parseView(sp.view);
  const data = await getLeaderboardData(view);

  const totalPages = Math.max(1, Math.ceil(data.organic.length / PAGE_SIZE));
  const page = parsePage(sp.page, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageOrganic = data.organic.slice(start, start + PAGE_SIZE);
  // Re-inject sponsored slots for this page (they only match ranks #10/#20 → page 1).
  // Attach sparklines for just this page's rows (one batched history query).
  const pageRows = await attachSparklines(injectSponsored(pageOrganic, data.sponsored));

  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-16 text-center sm:py-24">
          <Link
            href="/about"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShieldCheck className="size-3.5 text-primary" />
            Every ranking verified via Google Search Console
          </Link>

          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            The organic traffic leaderboard for the whole web
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            {siteConfig.tagline} Ranked by <strong className="text-foreground">momentum</strong>{" "}
            so fast-growing sites can beat the giants — not just whoever&apos;s biggest.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">Connect Google Search Console</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#leaderboard">View the leaderboard</Link>
            </Button>
          </div>

          {/* Aggregate stats */}
          <dl className="mt-12 grid grid-cols-3 gap-8 sm:gap-16">
            <Stat label="Sites ranked" value={formatCompact(data.totalSites)} />
            <Stat
              label="Organic clicks / 28d"
              value={formatCompact(data.totalClicks28d)}
            />
            <Stat
              label="Refreshed"
              value={data.lastUpdated ? timeAgo(data.lastUpdated) : "—"}
              icon={<RefreshCw className="size-4" />}
            />
          </dl>
        </div>
      </section>

      {/* Leaderboard */}
      <section id="leaderboard" className="container scroll-mt-20 py-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {view === "momentum" ? "Momentum leaders" : "Volume leaders"}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp className="size-4" />
              {view === "momentum"
                ? "Ranked by growth velocity — last 7 days vs. the prior 21."
                : "Ranked by total organic clicks over the last 28 days."}
            </p>
          </div>
          <Suspense fallback={null}>
            <RankingToggle view={view} />
          </Suspense>
        </div>

        {data.totalSites === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-lg font-medium">No sites on the board yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first — connect Google Search Console and publish your site to
              claim the top spot.
            </p>
            <Button asChild className="mt-5">
              <Link href="/dashboard">Add your site</Link>
            </Button>
          </div>
        ) : (
          <>
            <LeaderboardJsonLd sites={pageOrganic} />
            <Leaderboard rows={pageRows} view={view} />

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              buildHref={(p) => leaderboardHref(view, p)}
            />

            <div className="mt-4 flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
              <p>
                Showing {start + 1}–{start + pageOrganic.length} of {data.totalSites}.
                Last updated {data.lastUpdated ? timeAgo(data.lastUpdated) : "—"}; refreshes
                every {siteConfig.refreshCadenceHours} hours.
              </p>
              {data.usingDummyData && (
                <p className="rounded-full border border-border px-2 py-0.5">
                  Preview data — connect a site to publish real numbers
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* Explore — internal links to landing pages + blog */}
      <section className="border-t border-border/60">
        <div className="container py-14">
          <h2 className="text-xl font-semibold tracking-tight">Explore</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Guides and rankings on verified organic traffic and the .lol
            leaderboard wave.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ExploreCard
              href="/best/fastest-growing-saas-websites"
              title="Fastest-growing SaaS websites"
              body="A live ranking of SaaS sites by verified organic momentum — not third-party estimates."
            />
            <ExploreCard
              href="/best/lol-directories"
              title="The best .lol directories"
              body="outbid.lol, TrustMRR, and RealRank compared — what each ranks, and which to trust."
            />
            <ExploreCard
              href="/blog/grow-saas-organic-traffic"
              title="How to grow organic traffic"
              body="A founder's playbook for the compounding channel that keeps paying after you stop."
            />
            <ExploreCard
              href="/blog/verified-vs-estimated-traffic"
              title="Verified vs estimated traffic"
              body="Why SimilarWeb and Search Console disagree — and which number you can actually trust."
            />
            <ExploreCard
              href="/blog/momentum-score-explained"
              title="What's a good momentum score?"
              body="How to read your ranking, why it moves week to week, and the honest ways to climb."
            />
            <ExploreCard
              href="/blog"
              title="All articles →"
              body="Essays on verified traffic, the pay-to-rank craze, and what really moves rankings."
            />
          </div>
        </div>
      </section>

      {/* Conversion band */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="container flex flex-col items-center gap-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Prove your growth. Get discovered.
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Connect Google Search Console (read-only), pick which verified
            properties to publish, and let real clicks decide your rank.
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/dashboard">Connect Search Console</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function ExploreCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
    >
      <p className="font-medium group-hover:text-primary">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <dt className="order-2 mt-1 text-xs text-muted-foreground">{label}</dt>
      <dd className="order-1 flex items-center gap-1.5 text-2xl font-bold tabular-nums sm:text-3xl">
        {icon}
        {value}
      </dd>
    </div>
  );
}
