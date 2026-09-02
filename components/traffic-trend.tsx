import { Users, MousePointerClick, Eye } from "lucide-react";
import type { SiteTraffic, TrafficDay } from "@/lib/data";
import { formatCompact } from "@/lib/utils";

/**
 * First-party traffic for RealRank itself: all-time totals plus a daily
 * sessions area chart. Server-rendered inline SVG, theme-aware via CSS custom
 * properties, no client JS. Data comes from the site_traffic_daily counter.
 */
export function TrafficTrend({
  totals,
  days,
}: {
  totals: SiteTraffic;
  days: TrafficDay[];
}) {
  const hasSeries = days.some((d) => d.sessions > 0 || d.visitors > 0);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Totals */}
      <dl className="grid grid-cols-3 gap-4">
        <TotalTile icon={<Eye className="size-4" />} label="Pageviews" value={totals.pageviews} />
        <TotalTile icon={<MousePointerClick className="size-4" />} label="Sessions" value={totals.sessions} />
        <TotalTile icon={<Users className="size-4" />} label="Visitors" value={totals.visitors} />
      </dl>

      {/* Daily sessions chart */}
      <div className="mt-6 border-t border-border pt-6">
        {hasSeries ? (
          <>
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Daily sessions · last {days.length} days
            </p>
            <SessionsChart days={days} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Traffic is being counted from launch. Daily sessions and visitors
            will chart here as people arrive.
          </p>
        )}
      </div>
    </div>
  );
}

function TotalTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div>
      <dd className="text-3xl font-bold tabular-nums">{formatCompact(value)}</dd>
      <dt className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </dt>
    </div>
  );
}

function SessionsChart({ days }: { days: TrafficDay[] }) {
  // Pad to a minimum width so a couple of early days still read as a chart.
  const series = days.length >= 2 ? days : [...days, ...days].slice(0, 2);
  const W = 720;
  const H = 160;
  const padT = 12;
  const padB = 22;
  const padX = 6;
  const n = series.length;
  const max = Math.max(1, ...series.map((d) => d.sessions));

  const x = (i: number) => padX + (i / (n - 1)) * (W - padX * 2);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

  const pts = series.map((d, i) => `${x(i).toFixed(1)},${y(d.sessions).toFixed(1)}`);
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
        aria-label={`Daily sessions over the last ${n} days, peaking at ${peak}.`}
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
        <circle cx={x(n - 1)} cy={y(last.sessions)} r={3.5} fill="hsl(var(--primary))" />
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
