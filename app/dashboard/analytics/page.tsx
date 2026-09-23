import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, Layers, Sparkles, Filter } from "lucide-react";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { getEventStats, getConnectFunnel } from "@/lib/data";
import type { EventDay, EventStat, ConnectFunnel } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getOptionalUser, isOwner } from "@/lib/auth";
import { formatCompact } from "@/lib/utils";

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
};

function labelFor(event: string): string {
  return EVENT_LABELS[event] ?? event.replace(/_/g, " ");
}

export default async function AnalyticsPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");

  const user = await getOptionalUser();
  if (!user) redirect("/login");
  // Owner-only surface — everyone else lands back on their own dashboard.
  if (!isOwner(user.email)) redirect("/dashboard");

  const [stats, funnel] = await Promise.all([getEventStats(30), getConnectFunnel(30)]);
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
        <StatCard
          label="Events (30d)"
          value={formatCompact(stats.total)}
          sub="feature interactions"
          icon={<Activity className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label="Distinct features"
          value={String(stats.distinct)}
          sub="with at least one use"
          icon={<Layers className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label="Top feature"
          value={topFeature}
          sub={stats.events[0] ? `${formatCompact(stats.events[0].hits)} uses` : "no data yet"}
          icon={<Sparkles className="size-4 text-muted-foreground" />}
        />
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

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-2 truncate text-3xl font-bold tabular-nums tracking-tight">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

/** Horizontal bar list — the datafast/umami "most-used" view. */
function FeatureBars({ events }: { events: EventStat[] }) {
  const max = Math.max(1, ...events.map((e) => e.hits));
  return (
    <ul className="flex flex-col gap-3">
      {events.map((e) => {
        const pct = Math.max(3, Math.round((e.hits / max) * 100));
        return (
          <li key={e.event}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium">{labelFor(e.event)}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCompact(e.hits)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
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
        <line x1={padX} y1={H - padB} x2={W - padX} y2={H - padB} stroke="hsl(var(--border))" strokeWidth={1} />
        <path d={area} fill="hsl(var(--primary) / 0.12)" />
        <path
          d={line}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={x(n - 1)} cy={y(last.hits)} r={3.5} fill="hsl(var(--primary))" />
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
