import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, Layers, Sparkles } from "lucide-react";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { getEventStats } from "@/lib/data";
import type { EventDay, EventStat } from "@/lib/data";
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

  const stats = await getEventStats(30);
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
