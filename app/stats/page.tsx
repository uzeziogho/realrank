import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ShieldCheck, ArrowUpRight, Users, MousePointerClick, Eye, Gauge } from "lucide-react";
import { getStatsData } from "@/lib/stats";
import { getSiteTraffic, getSiteTrafficSeries, getTrafficBreakdown } from "@/lib/data";
import { TrafficTrend } from "@/components/traffic-trend";
import { TrafficBreakdown } from "@/components/traffic-breakdown";
import { CiteIndex } from "@/components/cite-index";
import { siteConfig } from "@/lib/config";
import { formatCompact, formatGrowth, siteHref, timeAgo } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The RealRank Index — Verified Organic Search Benchmark",
  description:
    "The RealRank Index tracks organic-search momentum across verified websites: the share growing vs. declining and the median week-over-week change, measured from real Google Search Console clicks. Free to cite, updated hourly, privacy-safe.",
  alternates: { canonical: "/stats" },
  openGraph: {
    title: "The RealRank Index — Verified Organic Search Benchmark",
    description:
      "How organic search is trending across verified websites, from real Search Console clicks. Free to cite.",
    url: `${siteConfig.url}/stats`,
  },
};

export default async function StatsPage() {
  const stats = await getStatsData();
  const traffic = await getSiteTraffic();
  const trafficSeries = await getSiteTrafficSeries(30);
  const breakdown = await getTrafficBreakdown(30);

  const asOf = new Date(stats.lastUpdated ?? Date.now());
  const period = asOf.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const indexUrl = `${siteConfig.url}/stats`;
  const trend =
    stats.medianGrowth > 0.005 ? "up" : stats.medianGrowth < -0.005 ? "down" : "flat";

  // schema.org/Dataset so search engines (and AI agents) treat the Index as a
  // citable dataset, not just a page.
  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "The RealRank Organic Search Index",
    description:
      "A privacy-safe benchmark of organic-search momentum across verified websites: the share growing vs. declining and the median week-over-week change, measured from real Google Search Console clicks.",
    url: indexUrl,
    creator: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by/4.0/",
    dateModified: asOf.toISOString(),
    measurementTechnique: "Verified Google Search Console organic clicks",
    variableMeasured: [
      { "@type": "PropertyValue", name: "Organic Index (100 = flat)", value: stats.index },
      { "@type": "PropertyValue", name: "Share of sites growing (%)", value: stats.growingPct },
      { "@type": "PropertyValue", name: "Share of sites declining (%)", value: stats.decliningPct },
      { "@type": "PropertyValue", name: "Median week-over-week growth", value: stats.medianGrowth },
      { "@type": "PropertyValue", name: "Qualifying websites", value: stats.qualifyingCount },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }}
      />

      {/* Hero — lead with the Index number so it's the citable headline */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-16 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Verified, privacy-safe data · {period}
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            The RealRank Index
          </h1>
          <div className="mt-6 flex items-baseline gap-3">
            <span
              className={`text-7xl font-bold tabular-nums tracking-tight ${
                trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-foreground"
              }`}
            >
              {stats.index}
            </span>
            <span className="text-lg text-muted-foreground">/ 100 = flat</span>
          </div>
          <p className="mt-4 max-w-2xl text-balance text-muted-foreground">
            The organic-search momentum of verified websites, from real Google Search
            Console clicks. Right now{" "}
            <strong className="text-foreground">{stats.growingPct}%</strong> are growing
            and <strong className="text-foreground">{stats.decliningPct}%</strong> are
            declining, with a median of {formatGrowth(stats.medianGrowth)} week-over-week
            across {stats.qualifyingCount} qualifying sites.
          </p>
        </div>
      </section>

      <div className="container max-w-4xl space-y-8 py-12">
        {/* Cite this Index — the link-bait block */}
        <CiteIndex
          index={stats.index}
          growingPct={stats.growingPct}
          medianGrowthLabel={formatGrowth(stats.medianGrowth)}
          period={period}
          url={indexUrl}
        />

        <p className="text-center text-sm text-muted-foreground">
          Want the narrative read?{" "}
          <Link href="/stats/report" className="font-medium text-primary hover:underline">
            Read the {period} Index Report
          </Link>
          .
        </p>

        {/* KPI row — at-a-glance headline metrics */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile icon={<Users className="size-4" />} label="Visitors" value={formatCompact(traffic.visitors)} sub="all-time" />
          <StatTile icon={<MousePointerClick className="size-4" />} label="Sessions" value={formatCompact(traffic.sessions)} sub="all-time" />
          <StatTile icon={<Eye className="size-4" />} label="Pageviews" value={formatCompact(traffic.pageviews)} sub="all-time" />
          <StatTile
            icon={<Gauge className="size-4" />}
            label="Organic Index"
            value={String(stats.index)}
            sub={`${formatGrowth(stats.medianGrowth)} median`}
            tone={stats.medianGrowth > 0.005 ? "up" : stats.medianGrowth < -0.005 ? "down" : undefined}
          />
        </section>

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
            <TrafficTrend totals={traffic} days={trafficSeries} showTotals={false} />
          </div>
        </section>

        {/* Where traffic comes from */}
        <section>
          <SectionLabel>First-party analytics</SectionLabel>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Where your traffic comes from
          </h2>
          <p className="text-sm text-muted-foreground">
            Top sources, landing pages, countries, and devices — counted
            first-party, cookieless, and aggregate only. Last 30 days.
          </p>
          <div className="mt-4">
            <TrafficBreakdown data={breakdown} />
          </div>
        </section>

        {/* Market pulse */}
        <section>
          <SectionLabel>Anonymous benchmark</SectionLabel>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {siteConfig.name} Organic Pulse
          </h2>
          <p className="text-sm text-muted-foreground">
            The share of verified sites growing vs. declining — last 7 days vs. the prior 21.
          </p>

          <div className="mt-4 rounded-xl border border-border bg-card p-6">
            <dl className="grid grid-cols-3 gap-4">
              <Metric label="Websites" value={String(stats.qualifyingCount)} />
              <Metric label="Growing" value={`${stats.growingPct}%`} tone="up" />
              <Metric label="Declining" value={`${stats.decliningPct}%`} tone="down" />
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">
              The Organic Index above is 100 when flat. It uses the{" "}
              <strong>median</strong> change so one large website cannot move the market.
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

        {/* Methodology — credibility for anyone citing the Index */}
        <section>
          <SectionLabel>Methodology</SectionLabel>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">How the Index is built</h2>
          <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Source.</strong> Every input is a
              verified Google Search Console click, pulled over a read-only connection
              from participating websites. Nothing here is a third-party estimate, and no
              site can pay to be included or to move the number.
            </p>
            <p>
              <strong className="text-foreground">The Index.</strong> It is{" "}
              <code>100 x (1 + median week-over-week growth)</code>, so 100 means the median
              site is flat, above 100 means the typical site is growing, and below 100 means
              it is shrinking. We use the <strong>median</strong>, not the average, so one
              large website cannot swing the market reading.
            </p>
            <p>
              <strong className="text-foreground">Window and sample.</strong> Growth compares
              the last 7 days against the prior 21 days of daily clicks. A site only counts
              once it has at least <strong>100 clicks</strong> in the prior period, which
              filters out noise from brand-new or tiny sites. This reading covers{" "}
              <strong className="text-foreground">{stats.qualifyingCount}</strong> qualifying
              websites and refreshes every {siteConfig.refreshCadenceHours} hours.
            </p>
            <p>
              <strong className="text-foreground">Privacy.</strong> The Index and the
              growing/declining shares are cohort-level conclusions only. Individual queries,
              pages, countries, and devices are never exposed.
            </p>
          </div>
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

function StatTile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      {sub && (
        <div
          className={`mt-0.5 text-xs ${
            tone === "up" ? "text-success" : tone === "down" ? "text-danger" : "text-muted-foreground"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
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
