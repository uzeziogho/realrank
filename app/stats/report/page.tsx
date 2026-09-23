import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ShieldCheck } from "lucide-react";
import { getStatsData } from "@/lib/stats";
import { CiteIndex } from "@/components/cite-index";
import { siteConfig } from "@/lib/config";
import { formatCompact, formatGrowth, siteHref, timeAgo } from "@/lib/utils";

export const revalidate = 3600;

function periodOf(iso: string | null): string {
  return new Date(iso ?? Date.now()).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getStatsData();
  const period = periodOf(stats.lastUpdated);
  const title = `The RealRank Index Report — Organic Search Trends, ${period}`;
  return {
    title,
    description: `Where organic search stands in ${period}: the RealRank Index is ${stats.index} (100 = flat), with ${stats.growingPct}% of verified websites growing and ${stats.decliningPct}% declining. Measured from real Google Search Console clicks.`,
    alternates: { canonical: "/stats/report" },
    openGraph: { title, url: `${siteConfig.url}/stats/report` },
  };
}

/** Auto-written lead so the report reads fresh every month with no manual edit. */
function narrative(s: Awaited<ReturnType<typeof getStatsData>>, period: string): string {
  if (s.qualifyingCount === 0) {
    return `The RealRank Index is still warming up in ${period} as verified websites connect their Search Console data. Once enough sites clear the sample threshold, this report will read the market every month.`;
  }
  const dir =
    s.medianGrowth > 0.005
      ? "expanding"
      : s.medianGrowth < -0.005
        ? "contracting"
        : "holding flat";
  return `Organic search is ${dir}. In ${period}, the RealRank Index sits at ${s.index} (100 is flat), meaning the typical verified website ${
    s.medianGrowth > 0.005 ? "grew" : s.medianGrowth < -0.005 ? "shrank" : "held steady"
  } by ${formatGrowth(s.medianGrowth)} week-over-week. Across ${s.qualifyingCount} qualifying sites, ${s.growingPct}% gained organic clicks and ${s.decliningPct}% lost them. Every figure below comes from verified Google Search Console clicks, not third-party estimates.`;
}

export default async function IndexReportPage() {
  const stats = await getStatsData();
  const period = periodOf(stats.lastUpdated);
  const reportUrl = `${siteConfig.url}/stats/report`;
  const Trend = stats.medianGrowth > 0.005 ? TrendingUp : stats.medianGrowth < -0.005 ? TrendingDown : Minus;
  const trendColor =
    stats.medianGrowth > 0.005 ? "text-success" : stats.medianGrowth < -0.005 ? "text-danger" : "text-muted-foreground";

  return (
    <div className="container max-w-3xl py-12">
      <span className="text-xs font-medium uppercase tracking-wider text-primary">
        The RealRank Index Report
      </span>
      <h1 className="mt-2 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
        Organic search trends, {period}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-2">
          <span className={`text-5xl font-bold tabular-nums ${trendColor}`}>{stats.index}</span>
          <span className="text-sm text-muted-foreground">Index (100 = flat)</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-lg font-medium ${trendColor}`}>
          <Trend className="size-5" />
          {formatGrowth(stats.medianGrowth)} median
        </span>
      </div>

      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        {narrative(stats, period)}
      </p>

      {/* Key readings */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Reading label="Index" value={String(stats.index)} />
        <Reading label="Growing" value={`${stats.growingPct}%`} tone="up" />
        <Reading label="Declining" value={`${stats.decliningPct}%`} tone="down" />
        <Reading label="Sites measured" value={String(stats.qualifyingCount)} />
      </div>

      {/* Top movers */}
      {stats.movers.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Fastest verified movers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The steepest organic-click growth this period, current vs. the prior window.
          </p>
          <ol className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {stats.movers.map((m) => (
              <li key={m.siteUrl} className="flex items-center gap-4 px-5 py-4">
                <span className="w-6 text-lg font-semibold tabular-nums text-muted-foreground">{m.rank}</span>
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
                  <p className="text-sm text-muted-foreground">{formatCompact(m.currentClicks)} current clicks</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-sm font-medium tabular-nums ${
                  m.growthRate > 0.005 ? "text-success" : m.growthRate < -0.005 ? "text-danger" : "text-muted-foreground"
                }`}>
                  {formatGrowth(m.growthRate)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Cite */}
      <div className="mt-10">
        <CiteIndex
          index={stats.index}
          growingPct={stats.growingPct}
          medianGrowthLabel={formatGrowth(stats.medianGrowth)}
          period={period}
          url={reportUrl}
        />
      </div>

      {/* Context / links */}
      <div className="mt-10 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="text-base font-semibold">How this is measured</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          The Index is <code>100 x (1 + median week-over-week growth)</code> across verified
          websites with at least 100 clicks in the prior period, refreshed every{" "}
          {siteConfig.refreshCadenceHours} hours. See the live figures and full methodology on
          the <Link href="/stats" className="text-primary hover:underline">RealRank Index</Link>{" "}
          page, or browse the{" "}
          <Link href="/leaderboard" className="text-primary hover:underline">verified leaderboard</Link>{" "}
          behind these numbers.
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Updated {stats.lastUpdated ? timeAgo(stats.lastUpdated) : "—"}.
        {stats.usingDummyData && " Preview data — connect sites to publish real numbers."}
      </p>
    </div>
  );
}

function Reading({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`text-2xl font-bold tabular-nums ${
        tone === "up" ? "text-success" : tone === "down" ? "text-danger" : "text-foreground"
      }`}>
        {value}
      </div>
      <div className="mt-0.5 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
