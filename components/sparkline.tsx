import { cn } from "@/lib/utils";

/**
 * Tiny inline-SVG trend line for a leaderboard row. No axes, no labels — just
 * the shape of recent daily organic clicks, colored by direction. Server-
 * rendered, theme-aware. Renders nothing when there isn't enough data.
 */
export function Sparkline({
  data,
  className,
  width = 72,
  height = 24,
}: {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 3) {
    return <span className={cn("inline-block text-muted-foreground/40", className)}>—</span>;
  }

  const pad = 2;
  const n = data.length;
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const range = Math.max(1, max - min);

  const x = (i: number) => pad + (i / (n - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);

  const line = `M ${data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" L ")}`;
  const area = `${line} L ${x(n - 1).toFixed(1)},${height - pad} L ${x(0).toFixed(1)},${height - pad} Z`;

  // Direction: recent 7 vs the window before it.
  const recent = data.slice(-7);
  const prior = data.slice(0, -7);
  const ra = recent.reduce((s, v) => s + v, 0) / recent.length;
  const pa = prior.length ? prior.reduce((s, v) => s + v, 0) / prior.length : ra;
  const tone = ra > pa * 1.02 ? "success" : ra < pa * 0.98 ? "danger" : "muted";
  const stroke =
    tone === "success"
      ? "hsl(var(--success))"
      : tone === "danger"
        ? "hsl(var(--danger))"
        : "hsl(var(--muted-foreground))";
  const fill =
    tone === "success"
      ? "hsl(var(--success) / 0.12)"
      : tone === "danger"
        ? "hsl(var(--danger) / 0.12)"
        : "hsl(var(--muted-foreground) / 0.10)";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={`Recent organic-click trend (${tone === "success" ? "up" : tone === "danger" ? "down" : "flat"})`}
    >
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(n - 1)} cy={y(data[n - 1])} r={1.75} fill={stroke} />
    </svg>
  );
}
