import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RankingToggle } from "@/components/ranking-toggle";
import { Leaderboard } from "@/components/leaderboard";
import { LeaderboardJsonLd } from "@/components/json-ld";
import { getLeaderboardData } from "@/lib/data";
import { siteConfig, type RankingView } from "@/lib/config";
import { formatCompact, timeAgo } from "@/lib/utils";

// Incremental Static Regeneration — full ranked list is in the initial HTML,
// refreshed at most hourly (and on-demand after the cron writes new data).
export const revalidate = 3600;

type SearchParams = Promise<{ view?: string }>;

function parseView(v?: string): RankingView {
  return v === "volume" ? "volume" : "momentum";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const view = parseView((await searchParams).view);
  const title =
    view === "volume"
      ? "Top Websites by Organic Traffic Volume"
      : "Fastest-Growing Websites by Organic Traffic";
  return {
    title,
    description: siteConfig.description,
    alternates: { canonical: view === "volume" ? "/?view=volume" : "/" },
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const view = parseView((await searchParams).view);
  const data = await getLeaderboardData(view);

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
              <Link href="/dashboard">Add your site — it&apos;s free</Link>
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

        <LeaderboardJsonLd sites={data.organic} />
        <Leaderboard rows={data.rows} view={view} />

        <div className="mt-4 flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <p>
            Last updated {data.lastUpdated ? timeAgo(data.lastUpdated) : "—"}. Data
            refreshes every {siteConfig.refreshCadenceHours} hours.
          </p>
          {data.usingDummyData && (
            <p className="rounded-full border border-border px-2 py-0.5">
              Preview data — connect a site to publish real numbers
            </p>
          )}
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
