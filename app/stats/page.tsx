import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Users, MousePointerClick, Eye } from "lucide-react";
import { getStatsData, getIndexHistory, type GrowthBucket } from "@/lib/stats";
import { getSiteTraffic, getSiteTrafficSeries } from "@/lib/data";
import { siteSlug } from "@/lib/site";
import { TrafficChart } from "@/components/traffic-chart";
import { IndexChart } from "@/components/index-chart";
import { SiteFavicon } from "@/components/site-favicon";
import { StatTile } from "@/components/dash/stat-tile";
import { CiteIndex } from "@/components/cite-index";
import { siteConfig } from "@/lib/config";
import { cn, formatCompact, formatGrowth, timeAgo } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The RealRank Index — Verified Organic Search Benchmark",
  description:
    "Is organic search traffic growing or shrinking? The RealRank Index tracks the median website's week-over-week change in verified Google Search Console clicks — with history, growth distribution and a breakdown by category. Free to cite, updated hourly.",
  alternates: { canonical: "/stats" },
  openGraph: {
    title: "The RealRank Index — Verified Organic Search Benchmark",
    description:
      "How organic search is trending across verified websites, from real Search Console clicks. With history and category breakdowns. Free to cite.",
    url: `${siteConfig.url}/stats`,
  },
};

/** Change in Index points between the latest reading and `daysBack` earlier. */
function pointsChange(history: Awaited<ReturnType<typeof getIndexHistory>>, daysBack: number): number | null {
  const valid = history.filter((p) => p.index !== null);
  if (valid.length < 2) return null;
  const last = valid[valid.length - 1];
  const targetT = Date.parse(last.date) - daysBack * 86_400_000;
  // The closest valid reading at or before the target day.
  const then = [...valid].reverse().find((p) => Date.parse(p.date) <= targetT) ?? null;
  return then ? Math.round((last.index! - then.index!) * 10) / 10 : null;
}

export default async function StatsPage() {
  const [stats, history, traffic, trafficSeries] = await Promise.all([
    getStatsData(),
    getIndexHistory(60),
    getSiteTraffic(),
    getSiteTrafficSeries(60),
  ]);

  const change30 = pointsChange(history, 30);
  const validHistory = history.filter((p) => p.index !== null);
  const high = validHistory.length ? Math.max(...validHistory.map((p) => p.index!)) : null;
  const low = validHistory.length ? Math.min(...validHistory.map((p) => p.index!)) : null;

  // RealRank's own first-party traffic: last 30 days vs the prior 30.
  const cur = trafficSeries.slice(-30);
  const prev = trafficSeries.slice(0, Math.max(0, trafficSeries.length - 30)).slice(-30);
  const sum = (rows: typeof trafficSeries, key: "visitors" | "sessions" | "pageviews") =>
    rows.reduce((s, d) => s + d[key], 0);
  const delta = (c: number, p: number): { label: string; direction: "up" | "down" | "flat" } | undefined => {
    if (p <= 0) return undefined;
    const r = (c - p) / p;
    const dir = r > 0.005 ? "up" : r < -0.005 ? "down" : "flat";
    return { label: `${r > 0 ? "+" : ""}${Math.round(r * 100)}%`, direction: dir };
  };
  const v30 = sum(cur, "visitors");
  const s30 = sum(cur, "sessions");
  const p30 = sum(cur, "pageviews");

  const asOf = new Date(stats.lastUpdated ?? Date.now());
  const period = asOf.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const indexUrl = `${siteConfig.url}/stats`;
  const trend = stats.medianGrowth > 0.005 ? "up" : stats.medianGrowth < -0.005 ? "down" : "flat";
  const verdict =
    trend === "up"
      ? "The typical verified site is gaining organic search clicks."
      : trend === "down"
        ? "The typical verified site is losing organic search clicks."
        : "The typical verified site is holding flat in organic search.";

  // schema.org/Dataset so search engines (and AI agents) treat the Index as a
  // citable dataset, not just a page.
  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "The RealRank Organic Search Index",
    description:
      "A privacy-safe benchmark of organic-search momentum across verified websites: the share growing vs. declining and the median week-over-week change, measured from real Google Search Console clicks, with daily history and a breakdown by category.",
    url: indexUrl,
    creator: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by/4.0/",
    dateModified: asOf.toISOString(),
    ...(validHistory.length > 1
      ? { temporalCoverage: `${validHistory[0].date}/${validHistory[validHistory.length - 1].date}` }
      : {}),
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />

      {/* Hero — the Index number is the citable headline; the verdict says what it means. */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-14 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Verified Search Console data · {period}
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            The RealRank Index
          </h1>
          <p className="mt-2 text-muted-foreground">Is organic search traffic growing or shrinking right now?</p>
          <div className="mt-6 flex items-baseline gap-3">
            <span
              className={cn(
                "text-7xl font-bold tabular-nums tracking-tight",
                trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-foreground",
              )}
            >
              {stats.index}
            </span>
            <span className="text-lg text-muted-foreground">/ 100 = flat</span>
          </div>
          {change30 !== null && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <ChangeIcon value={change30} />
              <span className="font-medium tabular-nums text-foreground">
                {change30 > 0 ? "+" : ""}
                {change30} pts
              </span>{" "}
              vs 30 days ago
            </p>
          )}
          <p className="mt-4 max-w-2xl text-balance text-muted-foreground">
            {verdict} Right now <strong className="text-foreground">{stats.growingPct}%</strong> of sites are
            growing and <strong className="text-foreground">{stats.decliningPct}%</strong> are declining — a
            median of <strong className="text-foreground">{formatGrowth(stats.medianGrowth)}</strong>{" "}
            week-over-week across {stats.qualifyingCount} qualifying sites.
          </p>
        </div>
      </section>

      <div className="container max-w-4xl space-y-12 py-12">
        {/* Index history */}
        <section>
          <SectionLabel>Trend</SectionLabel>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">The Index over the last 60 days</h2>
          <p className="text-sm text-muted-foreground">
            Rebuilt day by day from verified daily clicks — each point is the median site&apos;s last 7 days vs
            the prior 21.
            {high !== null && low !== null && (
              <>
                {" "}
                Range: <span className="tabular-nums">{low}</span>–<span className="tabular-nums">{high}</span>.
              </>
            )}
          </p>
          <div className="mt-4">
            <IndexChart points={history} />
          </div>
        </section>

        {/* Breadth: how growth is spread */}
        <section>
          <SectionLabel>Breadth</SectionLabel>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">How growth is spread</h2>
          <p className="text-sm text-muted-foreground">
            Every qualifying site, bucketed by its week-over-week change. A healthy market leans right.
          </p>
          <Distribution buckets={stats.distribution} total={stats.qualifyingCount} />
        </section>

        {/* By category */}
        {stats.byCategory.length > 0 && (
          <section>
            <SectionLabel>By category</SectionLabel>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Which categories are growing</h2>
            <p className="text-sm text-muted-foreground">
              Median week-over-week change per category. Shown only where at least 3 sites qualify, so no
              reading traces back to one site.
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">Sites</th>
                    <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">Growing</th>
                    <th className="px-3 py-3 text-right font-medium">Median WoW</th>
                    <th className="px-5 py-3 text-right font-medium">Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {stats.byCategory.map((c) => (
                    <tr key={c.slug}>
                      <td className="px-5 py-3">
                        <Link href={`/best/fastest-growing/${c.slug}`} className="font-medium hover:text-primary hover:underline">
                          {c.label}
                        </Link>
                      </td>
                      <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">{c.sites}</td>
                      <td className="hidden px-3 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">{c.growingPct}%</td>
                      <td className="px-3 py-3 text-right">
                        <GrowthText ratio={c.medianGrowth} />
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums">{c.index}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Verified movers — internal profiles, so the data leads somewhere. */}
        <section>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <SectionLabel>Verified movers</SectionLabel>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Fastest-growing this week</h2>
            </div>
            <Link href="/best/fastest-growing" className="text-sm text-primary hover:underline">
              Full ranking →
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
            {stats.movers.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Not enough qualifying sites yet.</p>
            ) : (
              <ol className="divide-y divide-border">
                {stats.movers.map((m) => (
                  <li key={m.siteUrl} className="relative flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40">
                    <span className="w-5 text-lg font-semibold tabular-nums text-muted-foreground">{m.rank}</span>
                    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/70 bg-background">
                      <SiteFavicon url={m.siteUrl} name={m.displayName} size={24} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/site/${siteSlug(m.siteUrl)}`} className="font-medium after:absolute after:inset-0 hover:underline">
                        {m.displayName}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {m.host} · {formatCompact(m.currentClicks)} clicks this week
                      </p>
                    </div>
                    <GrowthText ratio={m.growthRate} />
                  </li>
                ))}
              </ol>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Ranked by click growth. Sites need at least 100 clicks in the prior period to qualify.
          </p>
        </section>

        {/* Cite this Index — the link-bait block */}
        <section className="space-y-4">
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
            </Link>{" "}
            or the{" "}
            <Link href="/state-of-indie-organic-traffic" className="font-medium text-primary hover:underline">
              State of Indie Organic Traffic
            </Link>
            .
          </p>
        </section>

        {/* Methodology — credibility for anyone citing the Index */}
        <section>
          <SectionLabel>Methodology</SectionLabel>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">How the Index is built</h2>
          <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Source.</strong> Every input is a verified Google Search
              Console click, pulled over a read-only connection from participating websites. Nothing here is a
              third-party estimate, and no site can pay to be included or to move the number.
            </p>
            <p>
              <strong className="text-foreground">The Index.</strong> It is{" "}
              <code>100 × (1 + median week-over-week growth)</code>, so 100 means the median site is flat, above
              100 means the typical site is growing, and below 100 means it is shrinking. We use the{" "}
              <strong>median</strong>, not the average, so one large website cannot swing the reading.
            </p>
            <p>
              <strong className="text-foreground">Window and sample.</strong> Growth compares the last 7 days
              against the prior 21 days of daily clicks. A site only counts once it has at least{" "}
              <strong>100 clicks</strong> in the prior period, which filters out noise from brand-new or tiny
              sites. This reading covers <strong className="text-foreground">{stats.qualifyingCount}</strong>{" "}
              qualifying websites and refreshes every {siteConfig.refreshCadenceHours} hours.
            </p>
            <p>
              <strong className="text-foreground">History.</strong> The 60-day chart applies the same windows
              and bar to each day of stored daily clicks. Search Console reports with a lag of a few days, so the
              chart ends on the latest day most sites have reported, and the live headline (from the latest
              refresh) can differ from the last point by a little.
            </p>
            <p>
              <strong className="text-foreground">Privacy.</strong> Everything here is a cohort-level
              conclusion. Category and daily readings are only shown when at least 3 sites qualify. Individual
              queries, pages, countries and devices are never exposed.
            </p>
          </div>
        </section>

        {/* RealRank's own traffic — open-startup transparency, clearly separate from the Index. */}
        <section>
          <SectionLabel>Open startup</SectionLabel>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{siteConfig.name}&apos;s own traffic</h2>
          <p className="text-sm text-muted-foreground">
            Not part of the Index — this is {siteConfig.name} itself, counted first-party with no third-party
            trackers. Last 30 days vs the prior 30.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              color="blue"
              icon={<Users className="size-4" />}
              label="Visitors"
              value={formatCompact(v30)}
              sub="last 30 days"
              delta={delta(v30, sum(prev, "visitors"))}
              spark={cur.map((d) => d.visitors)}
            />
            <StatTile
              color="green"
              icon={<MousePointerClick className="size-4" />}
              label="Sessions"
              value={formatCompact(s30)}
              sub="last 30 days"
              delta={delta(s30, sum(prev, "sessions"))}
              spark={cur.map((d) => d.sessions)}
            />
            <StatTile
              color="amber"
              icon={<Eye className="size-4" />}
              label="Pageviews"
              value={formatCompact(p30)}
              sub="last 30 days"
              delta={delta(p30, sum(prev, "pageviews"))}
              spark={cur.map((d) => d.pageviews)}
            />
          </div>
          <div className="mt-4">
            <TrafficChart days={cur} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            All-time since launch: {formatCompact(traffic.visitors)} visitors · {formatCompact(traffic.sessions)}{" "}
            sessions · {formatCompact(traffic.pageviews)} pageviews.
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
  return <span className="text-xs font-medium uppercase tracking-wider text-primary">{children}</span>;
}

/** Diverging colours: declines in danger, flat in neutral, growth in success. */
const BUCKET_FILL: Record<GrowthBucket["polarity"], string> = {
  [-2]: "bg-danger",
  [-1]: "bg-danger/45",
  0: "bg-muted-foreground/35",
  1: "bg-success/50",
  2: "bg-success",
};

function Distribution({ buckets, total }: { buckets: GrowthBucket[]; total: number }) {
  if (total === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
        Not enough qualifying sites yet.
      </div>
    );
  }
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return (
    <div className="mt-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <ol className="grid h-48 grid-cols-5 items-end gap-2 sm:gap-4" aria-label="Sites by week-over-week change">
        {buckets.map((b) => (
          <li key={b.label} className="group flex h-full flex-col items-center justify-end gap-1.5" title={`${b.label}: ${b.count} sites (${b.pct}%)`}>
            <span className="text-xs font-semibold tabular-nums">{b.pct}%</span>
            <span
              className={cn("w-full max-w-16 rounded-t-[4px] transition-opacity group-hover:opacity-80", BUCKET_FILL[b.polarity])}
              style={{ height: `${Math.max((b.count / max) * 100, b.count > 0 ? 3 : 0)}%` }}
            />
          </li>
        ))}
      </ol>
      <ol className="mt-2 grid grid-cols-5 gap-2 border-t border-border pt-2 sm:gap-4">
        {buckets.map((b) => (
          <li key={b.label} className="text-center text-[11px] leading-tight text-muted-foreground sm:text-xs">
            {b.label}
            <span className="block tabular-nums text-muted-foreground/70">{b.count} sites</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ChangeIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="size-4 text-success" />;
  if (value < 0) return <TrendingDown className="size-4 text-danger" />;
  return <Minus className="size-4" />;
}

function GrowthText({ ratio }: { ratio: number }) {
  const positive = ratio > 0.005;
  const negative = ratio < -0.005;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const color = positive ? "text-success" : negative ? "text-danger" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium tabular-nums ${color}`}>
      <Icon className="size-4" />
      {formatGrowth(ratio)}
    </span>
  );
}
