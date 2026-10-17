import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Layers, Sparkles, Filter, CalendarRange } from "lucide-react";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { StatTile } from "@/components/dash/stat-tile";
import {
  getEventStats,
  getConnectFunnel,
  getFeatureUsageReport,
  isReportPeriod,
  REPORT_PERIODS,
} from "@/lib/data";
import type {
  EventDay,
  EventStat,
  ConnectFunnel,
  FeatureUsageReport,
  ReportPeriod,
} from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getOptionalUser, isOwner } from "@/lib/auth";
import { cn, formatCompact, formatGrowth } from "@/lib/utils";
import { dashVar, dashColorAt } from "@/lib/dash-colors";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

/** Friendly labels for the raw event names the beacons emit. */
const EVENT_LABELS: Record<string, string> = {
  report_card: "Report Card",
  rank_check: "Rank checker",
  momentum_calc: "Momentum calculator",
  growth_grader: "Growth grader",
  traffic_reality: "Is my traffic real?",
  badge_copy: "Badge copied",
  embed_copy: "Widget copied",
  cite_copy: "Index citation copied",
  cite_embed_copy: "Index embed copied",
  connect_click: "Connect clicked",
  movers_post_copy: "Movers post copied",
  movers_post_share: "Movers post shared",
  listing_created: "Listing created",
  listing_verified: "Listing verified",
  outbound_click: "Outbound click to a listed site",
  signup: "Signed up",
};

function labelFor(event: string): string {
  return EVENT_LABELS[event] ?? event.replace(/_/g, " ");
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/dashboard");

  const user = await getOptionalUser();
  if (!user) redirect("/login");
  // Owner-only surface — everyone else lands back on their own dashboard.
  if (!isOwner(user.email)) redirect("/dashboard");

  // ?period= drives the comparison report; anything unrecognised reads as WoW.
  const { period: rawPeriod } = await searchParams;
  const period: ReportPeriod = isReportPeriod(rawPeriod) ? rawPeriod : "wow";

  const [stats, funnel, report] = await Promise.all([
    getEventStats(30),
    getConnectFunnel(30),
    getFeatureUsageReport(period),
  ]);
  const topFeature = stats.events[0] ? labelFor(stats.events[0].event) : "—";

  return (
    <div className="container max-w-5xl py-10">
      <DashboardTabs owner />

      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Which features people actually use — aggregate, privacy-safe counts from
          the last 30 days. No cookies, no PII, owner-only.
        </p>
      </div>

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile
          color="green"
          label="Events (30d)"
          value={formatCompact(stats.total)}
          sub="feature interactions"
          icon={<Activity className="size-4" />}
          spark={stats.daily.map((d) => d.hits)}
        />
        <StatTile
          color="blue"
          label="Distinct features"
          value={String(stats.distinct)}
          sub="with at least one use"
          icon={<Layers className="size-4" />}
        />
        <StatTile
          color="violet"
          label="Top feature"
          value={topFeature}
          sub={stats.events[0] ? `${formatCompact(stats.events[0].hits)} uses` : "no data yet"}
          icon={<Sparkles className="size-4" />}
        />
      </section>

      {/* Period comparison — the same events read against the window before */}
      <section className="mt-10">
        <div className="mb-1 flex items-center gap-2">
          <CalendarRange className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Feature usage report</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Every feature event in the current window against the one before it.
        </p>
        <PeriodTabs active={report.period} />
        <div className="mt-4 rounded-xl border border-border bg-card p-6">
          <UsageReport report={report} />
        </div>
      </section>

      {/* Connect funnel — visits to sites on the board */}
      <section className="mt-10">
        <div className="mb-1 flex items-center gap-2">
          <Filter className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Connect funnel</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Visits to sites on the board, last {funnel.days} days. &quot;Sites on the
          board&quot; is the cumulative total, so treat the last step as a running tally.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <ConnectFunnelView funnel={funnel} />
        </div>
      </section>

      {stats.total === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">No events yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Feature-usage events start counting as visitors use the calculators,
            rank checker, report card and badge. They&apos;ll chart here once the
            first ones land.
          </p>
        </div>
      ) : (
        <>
          {/* Daily trend */}
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">Daily events</h2>
            <div className="rounded-xl border border-border bg-card p-6">
              <EventsChart days={stats.daily} />
            </div>
          </section>

          {/* Feature usage bar list */}
          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold">Feature usage</h2>
            <div className="rounded-xl border border-border bg-card p-6">
              <FeatureBars events={stats.events} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** Horizontal bar list — the datafast/umami "most-used" view, colored by rank. */
function FeatureBars({ events }: { events: EventStat[] }) {
  const max = Math.max(1, ...events.map((e) => e.hits));
  return (
    <ul className="flex flex-col gap-3">
      {events.map((e, i) => {
        const pct = Math.max(3, Math.round((e.hits / max) * 100));
        const color = dashVar[dashColorAt(i)];
        return (
          <li key={e.event}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <span className="size-2 shrink-0 rounded-[3px]" style={{ backgroundColor: color }} aria-hidden />
                <span className="truncate">{labelFor(e.event)}</span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCompact(e.hits)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Funnel: visits -> tool -> connect click -> on the board, with step conversion. */
function ConnectFunnelView({ funnel }: { funnel: ConnectFunnel }) {
  const stages = [
    { label: "Visits", value: funnel.visits },
    { label: "Used a free tool", value: funnel.toolUses },
    { label: "Clicked connect", value: funnel.connectClicks },
    { label: "Sites on the board", value: funnel.connectedSites, cumulative: true },
  ];
  const top = Math.max(1, funnel.visits);

  if (funnel.visits === 0 && funnel.toolUses === 0 && funnel.connectClicks === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        The funnel fills in as visits, tool usage and connect clicks come in.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : null;
        const conv = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null;
        const width = Math.max(3, Math.round((s.value / top) * 100));
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium">
                {s.label}
                {s.cumulative && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">total</span>
                )}
              </span>
              <span className="flex items-baseline gap-2">
                {conv != null && !s.cumulative && (
                  <span className="text-xs text-muted-foreground tabular-nums">{conv}%</span>
                )}
                <span className="text-sm font-semibold tabular-nums">{formatCompact(s.value)}</span>
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${s.cumulative ? "bg-success" : "bg-primary"}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}

      {funnel.bySource.length > 0 && (
        <div className="mt-2 border-t border-border pt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Connect clicks by source
          </p>
          <ul className="flex flex-col gap-1.5">
            {funnel.bySource.map((s) => (
              <li key={s.source} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground">{s.source}</span>
                <span className="shrink-0 font-semibold tabular-nums">{formatCompact(s.hits)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Server-rendered inline SVG area chart of total events per day. */
function EventsChart({ days }: { days: EventDay[] }) {
  const hasSeries = days.some((d) => d.hits > 0);
  if (!hasSeries) {
    return (
      <p className="text-sm text-muted-foreground">
        Daily events will chart here as usage comes in.
      </p>
    );
  }

  const series = days.length >= 2 ? days : [...days, ...days].slice(0, 2);
  const W = 720;
  const H = 160;
  const padT = 12;
  const padB = 22;
  const padX = 6;
  const n = series.length;
  const max = Math.max(1, ...series.map((d) => d.hits));

  const x = (i: number) => padX + (i / (n - 1)) * (W - padX * 2);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

  const pts = series.map((d, i) => `${x(i).toFixed(1)},${y(d.hits).toFixed(1)}`);
  const line = `M ${pts.join(" L ")}`;
  const area = `${line} L ${x(n - 1).toFixed(1)},${(H - padB).toFixed(1)} L ${x(0).toFixed(1)},${(H - padB).toFixed(1)} Z`;

  const first = series[0];
  const last = series[n - 1];
  const peak = Math.round(max);

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        role="img"
        preserveAspectRatio="none"
        aria-label={`Daily events over the last ${n} days, peaking at ${peak}.`}
      >
        <defs>
          <linearGradient id="events-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={padX} y1={H - padB} x2={W - padX} y2={H - padB} stroke="hsl(var(--border))" strokeWidth={1} />
        <path d={area} fill="url(#events-fill)" />
        <path
          d={line}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={x(n - 1)} cy={y(last.hits)} r={4} fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth={2} />
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{fmtShort(first.day)}</span>
        <span>peak {formatCompact(peak)}/day</span>
        <span>{fmtShort(last.day)}</span>
      </div>
    </>
  );
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Period selector — plain links, so the page stays a server component. */
function PeriodTabs({ active }: { active: ReportPeriod }) {
  return (
    <div
      role="tablist"
      aria-label="Comparison period"
      className="inline-flex items-center rounded-lg border border-border bg-card p-1"
    >
      {REPORT_PERIODS.map((p) => (
        <Link
          key={p.key}
          href={`/dashboard/analytics?period=${p.key}`}
          role="tab"
          aria-selected={p.key === active}
          title={p.label}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            p.key === active
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.short}
        </Link>
      ))}
    </div>
  );
}

function fmtRange(w: { start: string; end: string }): string {
  return `${fmtShort(w.start)} – ${fmtShort(w.end)}`;
}

/** Current vs previous per feature, with the totals line on top. */
function UsageReport({ report }: { report: FeatureUsageReport }) {
  const periodLabel =
    REPORT_PERIODS.find((p) => p.key === report.period)?.label ?? report.period;

  if (report.features.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No feature events in {fmtRange(report.current)} or the window before it.
        Usage will appear here as visitors use the tools.
      </p>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <div className="text-sm font-medium">{periodLabel}</div>
          <div className="text-xs text-muted-foreground">
            {fmtRange(report.current)} vs {fmtRange(report.previous)}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {formatCompact(report.totalCurrent)}
          </span>
          <span className="text-xs text-muted-foreground">events</span>
          <ChangeBadge change={report.totalChange} />
        </div>
      </div>

      {/* A zero "previous" means two very different things — usage stopped, or
          the site had no data back then. Say which, rather than print -100%. */}
      {report.insufficientHistory && (
        <p className="mb-4 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          No events recorded in {fmtRange(report.previous)} — that window predates
          the data, so treat these as first-period figures rather than a decline.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="pb-2 font-semibold">Feature</th>
              <th scope="col" className="pb-2 text-right font-semibold">Current</th>
              <th scope="col" className="pb-2 text-right font-semibold">Previous</th>
              <th scope="col" className="pb-2 text-right font-semibold">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {report.features.map((f) => (
              <tr key={f.event}>
                <td className="py-2.5 pr-3 font-medium">{labelFor(f.event)}</td>
                <td className="py-2.5 text-right tabular-nums">{formatCompact(f.current)}</td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                  {formatCompact(f.previous)}
                </td>
                <td className="py-2.5 text-right">
                  <ChangeBadge change={f.change} isNew={f.previous === 0 && f.current > 0} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** A signed percentage, or "new"/"—" when there is no prior figure to divide by. */
function ChangeBadge({ change, isNew = false }: { change: number | null; isNew?: boolean }) {
  if (change === null) {
    return (
      <span className="text-xs text-muted-foreground">{isNew ? "new" : "—"}</span>
    );
  }
  const tone =
    change > 0.005 ? "text-success" : change < -0.005 ? "text-danger" : "text-muted-foreground";
  return <span className={`text-sm font-medium tabular-nums ${tone}`}>{formatGrowth(change)}</span>;
}
