import { TrendingDown, TrendingUp } from "lucide-react";
import type { DailyPoint } from "@/lib/site";
import { formatCompact, formatGrowth } from "@/lib/utils";

/**
 * Momentum timeline — a server-rendered inline-SVG area chart of daily organic
 * clicks, with the most recent 7-day window highlighted. Lets a site owner SEE
 * whether a spike (e.g. a pay-to-rank bid) left behind durable organic growth,
 * or evaporated. No client JS; theme-aware via CSS custom properties.
 */
export function MomentumTimeline({
  history,
  preview = false,
}: {
  history: DailyPoint[];
  preview?: boolean;
}) {
  if (history.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        Momentum history starts building after the first data refresh. Check back
        soon — daily organic clicks will appear here.
      </div>
    );
  }

  // Geometry.
  const W = 720;
  const H = 190;
  const padT = 14;
  const padB = 26;
  const padX = 6;
  const n = history.length;
  const max = Math.max(1, ...history.map((d) => d.clicks));

  const x = (i: number) => padX + (i / (n - 1)) * (W - padX * 2);
  const y = (c: number) => padT + (1 - c / max) * (H - padT - padB);

  const linePts = history.map((d, i) => `${x(i).toFixed(1)},${y(d.clicks).toFixed(1)}`);
  const linePath = `M ${linePts.join(" L ")}`;
  const areaPath = `${linePath} L ${x(n - 1).toFixed(1)},${(H - padB).toFixed(1)} L ${x(0).toFixed(1)},${(H - padB).toFixed(1)} Z`;

  // Recent 7-day window vs the prior 21 days — the momentum comparison.
  const recent = history.slice(-7);
  const prior = history.slice(-28, -7);
  const recentAvg = avg(recent.map((d) => d.clicks));
  const priorAvg = prior.length ? avg(prior.map((d) => d.clicks)) : 0;
  const growth = priorAvg > 0 ? (recentAvg - priorAvg) / priorAvg : recentAvg > 0 ? 1 : 0;
  const up = growth >= 0;

  const boundaryI = Math.max(0, n - 7);
  const bandX = x(boundaryI);
  const bandW = x(n - 1) - bandX;

  const first = history[0];
  const last = history[n - 1];

  return (
    <figure className="rounded-xl border border-border bg-card p-5">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Organic momentum</p>
          <p className="text-xs text-muted-foreground">
            Daily Search Console clicks · last {n} days
            {preview && " · preview data"}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            up ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {up ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
          {formatGrowth(growth)} last 7 days
        </div>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full"
        role="img"
        preserveAspectRatio="none"
        aria-label={`Daily organic clicks over the last ${n} days. Recent 7-day average ${Math.round(
          recentAvg,
        )} clicks per day versus ${Math.round(priorAvg)} in the prior window (${formatGrowth(growth)}).`}
      >
        {/* Recent-7-day highlight band */}
        <rect
          x={bandX}
          y={padT}
          width={bandW}
          height={H - padT - padB}
          fill="hsl(var(--primary) / 0.08)"
        />
        <line
          x1={bandX}
          y1={padT}
          x2={bandX}
          y2={H - padB}
          stroke="hsl(var(--primary) / 0.4)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {/* Baseline */}
        <line
          x1={padX}
          y1={H - padB}
          x2={W - padX}
          y2={H - padB}
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />
        {/* Area + line */}
        <path d={areaPath} fill="hsl(var(--primary) / 0.12)" />
        <path
          d={linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Last point marker */}
        <circle cx={x(n - 1)} cy={y(last.clicks)} r={3.5} fill="hsl(var(--primary))" />
      </svg>

      {/* X-axis endpoints + legend */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{fmtShort(first.date)}</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm bg-primary/15 ring-1 ring-primary/40" />
          Last 7 days
        </span>
        <span>{fmtShort(last.date)}</span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Recent 7-day pace: <strong className="text-foreground">{formatCompact(Math.round(recentAvg))}</strong>{" "}
        clicks/day vs <strong className="text-foreground">{formatCompact(Math.round(priorAvg))}</strong>{" "}
        before. A lasting lift after a traffic spike is real growth; a spike that
        falls back to the prior line is not.
      </p>
    </figure>
  );
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0;
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
