import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ShieldCheck, ArrowUpRight } from "lucide-react";
import { getStatsData } from "@/lib/stats";
import { getSiteTraffic, getSiteTrafficSeries } from "@/lib/data";
import { TrafficTrend } from "@/components/traffic-trend";
import { siteConfig } from "@/lib/config";
import { formatCompact, formatGrowth, siteHref, timeAgo } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Organic Search Stats — Anonymous Benchmark",
  description:
    "Verified, privacy-safe organic search benchmarks: the RealRank Index of median growth, growing vs. declining share, and the fastest verified movers. Anonymized conclusions only.",
  alternates: { canonical: "/stats" },
};

export default async function StatsPage() {
  const stats = await getStatsData();
  const traffic = await getSiteTraffic();
  const trafficSeries = await getSiteTrafficSeries(30);

  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-16 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Verified, privacy-safe data
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Organic search stats, without the guesswork.
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-muted-foreground">
            Anonymized conclusions from participating websites. Individual queries,
            pages, countries, and devices are never exposed.
          </p>
        </div>
      </section>

      <div className="container max-w-4xl space-y-10 py-12">
        {/* RealRank's own traffic — first-party counter */}
        <section>
          <SectionLabel>First-party analytics</SectionLabel>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {siteConfig.name} traffic
          </h2>
          <p className="text-sm text-muted-foreground">
            Real visits to {siteConfig.name} itself — counted first-party, no
            third-party trackers. Cumulative since launch.
          </p>
          <div className="mt-4">
            <TrafficTrend totals={traffic} days={trafficSeries} />
          </div>
        </section>

        {/* Organic Index */}
        <section>
          <SectionLabel>Anonymous benchmark</SectionLabel>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {siteConfig.name} Organic Pulse
          </h2>
          <p className="text-sm text-muted-foreground">
            Last 7 days vs. the prior 21.
          </p>

          <div className="mt-4 rounded-xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {siteConfig.name} Organic Index
              </span>
              <span className="text-4xl font-bold tabular-nums">{stats.index}</span>
              <GrowthText ratio={stats.medianGrowth} suffix="median growth" />
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-6">
              <Metric label="Websites" value={String(stats.qualifyingCount)} />
              <Metric
                label="Growing"
                value={`${stats.growingPct}%`}
                tone="up"
              />
              <Metric
                label="Declining"
                value={`${stats.decliningPct}%`}
                tone="down"
              />
            </dl>

            <p className="mt-4 text-xs text-muted-foreground">
              100 means flat. The index uses the <strong>median</strong> change so
              one large website cannot move the market.
            </p>
          </div>
        </section>

        {/* Verified movers */}
        <section>
          <SectionLabel>Verified movers</SectionLabel>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">SEO Momentum</h2>
          <p className="text-sm text-muted-foreground">Current vs. previous period.</p>

          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
            {stats.movers.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Not enough qualifying sites yet.
              </p>
            ) : (
              <ol className="divide-y divide-border">
                {stats.movers.map((m) => (
                  <li key={m.siteUrl} className="flex items-center gap-4 px-5 py-4">
                    <span className="w-6 text-lg font-semibold tabular-nums text-muted-foreground">
                      {m.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <a
                        href={siteHref(m.siteUrl)}
                        target="_blank"
                        rel="noopener nofollow"
                        className="group inline-flex items-center gap-1 font-medium hover:underline"
                      >
                        {m.host}
                        <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {formatCompact(m.currentClicks)} current clicks
                      </p>
                    </div>
                    <GrowthText ratio={m.growthRate} />
                  </li>
                ))}
              </ol>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Ranked by click growth. Sites need at least 100 clicks in the prior
            period to qualify.
          </p>
        </section>

        {/* Roadmap note — honest about what's not yet collected */}
        <section className="rounded-xl border border-dashed border-border bg-card/50 p-6">
          <h3 className="font-medium">More cohort benchmarks are coming</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            CTR by Google position, search-visibility distribution, and device &
            market signals arrive once the metrics pipeline begins collecting
            anonymized impressions, positions, and geographies. Only cohort-level
            conclusions that meet a minimum sample will ever be shown — never
            per-site or per-query data.
          </p>
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Updated {stats.lastUpdated ? timeAgo(stats.lastUpdated) : "—"}.
          {stats.usingDummyData && " Preview data — connect sites to publish real numbers."}
        </p>
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wider text-primary">
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div>
      <dd
        className={`text-2xl font-bold tabular-nums ${
          tone === "up" ? "text-success" : tone === "down" ? "text-danger" : ""
        }`}
      >
        {value}
      </dd>
      <dt className="mt-1 text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

function GrowthText({ ratio, suffix }: { ratio: number; suffix?: string }) {
  const positive = ratio > 0.005;
  const negative = ratio < -0.005;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const color = positive ? "text-success" : negative ? "text-danger" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium tabular-nums ${color}`}>
      <Icon className="size-4" />
      {formatGrowth(ratio)}
      {suffix && <span className="text-muted-foreground">{suffix}</span>}
    </span>
  );
}
