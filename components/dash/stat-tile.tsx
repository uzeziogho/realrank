import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashVar, dashTint, type DashColor } from "@/lib/dash-colors";

/**
 * A colorful KPI tile for the dashboards: a themed icon chip, a headline value,
 * a label, an optional sub-line, and an optional mini trend spark. The color
 * only ever carries identity (the chip + spark); the value and label stay in
 * ink tokens. Server component — no client JS.
 */
export function StatTile({
  icon,
  label,
  value,
  sub,
  color = "green",
  tone,
  delta,
  spark,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: DashColor;
  /** Colors the sub-line (up = success, down = danger). */
  tone?: "up" | "down";
  /** A small growth pill in the top-right, e.g. "+12%". Sign drives its color. */
  delta?: { label: string; direction: "up" | "down" | "flat" };
  /** Optional recent series for a tiny colored area spark along the bottom. */
  spark?: number[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className="flex size-9 items-center justify-center rounded-lg"
          style={{ color: dashVar[color], backgroundColor: dashTint(color, 14) }}
        >
          {icon}
        </span>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
              delta.direction === "up"
                ? "bg-success/10 text-success"
                : delta.direction === "down"
                  ? "bg-danger/10 text-danger"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {delta.direction === "up" && <TrendingUp className="size-3" />}
            {delta.direction === "down" && <TrendingDown className="size-3" />}
            {delta.label}
          </span>
        )}
      </div>

      <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{value}</div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      {sub && (
        <div
          className={cn(
            "mt-0.5 text-xs",
            tone === "up" ? "text-success" : tone === "down" ? "text-danger" : "text-muted-foreground",
          )}
        >
          {sub}
        </div>
      )}

      {spark && spark.length >= 3 && <MiniSpark data={spark} color={color} />}
    </div>
  );
}

/** A tiny colored area+line spark, anchored to the tile's bottom edge. */
function MiniSpark({ data, color }: { data: number[]; color: DashColor }) {
  const W = 200;
  const H = 34;
  const pad = 2;
  const n = data.length;
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);
  const x = (i: number) => pad + (i / (n - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / range) * (H - pad * 2);
  const line = `M ${data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" L ")}`;
  const area = `${line} L ${x(n - 1).toFixed(1)},${H} L ${x(0).toFixed(1)},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-3 h-8 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={area} fill={dashTint(color, 16)} />
      <path
        d={line}
        fill="none"
        stroke={dashVar[color]}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
