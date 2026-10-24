"use client";

import { useRef, useState } from "react";
import type { TrafficDay } from "@/lib/data";
import { formatCompact } from "@/lib/utils";

/**
 * Daily first-party traffic as one combined chart: visitors (area + line) and
 * pageviews (bars), on independent scales. Click a legend chip to toggle a
 * series; hover for a per-day readout. Theme-aware via the dash categorical CSS
 * vars (--cat-1 visitors, --cat-2 pageviews). Client component — the toggle and
 * hover need state — but a small leaf fed pre-read, serializable data.
 */
const V = "var(--cat-1)"; // visitors — brand green
const P = "var(--cat-2)"; // pageviews — blue

export function TrafficChart({ days }: { days: TrafficDay[] }) {
  const [showV, setShowV] = useState(true);
  const [showP, setShowP] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const series = days.filter((d) => d);
  const hasData = series.some((d) => d.visitors > 0 || d.pageviews > 0);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Daily visitors and pageviews will chart here as the first-party beacon
          records visits.
        </p>
      </div>
    );
  }

  const totalV = series.reduce((s, d) => s + d.visitors, 0);
  const totalP = series.reduce((s, d) => s + d.pageviews, 0);

  // viewBox geometry (the SVG scales to its container; hover maps clientX back).
  const W = 760;
  const H = 240;
  const L = 44;
  const R = 46;
  const T = 12;
  const B = 28;
  const pw = W - L - R;
  const ph = H - T - B;
  const n = series.length;

  const niceMax = (x: number) => {
    if (x <= 0) return 1;
    const e = Math.pow(10, String(Math.round(x)).length - 1);
    return Math.ceil(x / e) * e;
  };
  const maxV = niceMax(Math.max(...series.map((d) => d.visitors)));
  const maxP = niceMax(Math.max(...series.map((d) => d.pageviews)));
  const xStep = pw / n;
  const xAt = (i: number) => L + xStep * i + xStep / 2;
  const yV = (v: number) => T + ph - (v / maxV) * ph;
  const yP = (v: number) => T + ph - (v / maxP) * ph;

  const lineD = series
    .map((d, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yV(d.visitors).toFixed(1)}`)
    .join(" ");
  const areaD = `${lineD} L${xAt(n - 1).toFixed(1)} ${T + ph} L${xAt(0).toFixed(1)} ${T + ph} Z`;
  const barW = Math.max(2, xStep * 0.5);

  const fmtDay = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // x-axis ticks: first, last, and two inside.
  const ticks = n <= 1 ? [0] : [0, Math.round(n / 3), Math.round((2 * n) / 3), n - 1];

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let i = Math.round((x - L - xStep / 2) / xStep);
    if (i < 0) i = 0;
    if (i > n - 1) i = n - 1;
    setHover(i);
  };

  const hv = hover != null ? series[hover] : null;
  const tipLeftPct = hover != null ? (xAt(hover) / W) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Legend / toggles */}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <LegendChip on={showV} color={V} label="Visitors" sum={totalV} onClick={() => (showP || !showV) && setShowV(!showV)} />
          <LegendChip on={showP} color={P} label="Pageviews" sum={totalP} onClick={() => (showV || !showP) && setShowP(!showP)} />
        </div>
        <span className="text-xs text-muted-foreground">Last {n} days · cookieless, no PII</span>
      </div>

      <div className="relative mt-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-56 w-full"
          role="img"
          aria-label={`Daily visitors and pageviews over the last ${n} days`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="tc-visitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={V} stopOpacity={0.22} />
              <stop offset="100%" stopColor={V} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* gridlines + dual axis labels */}
          {[0, 1, 2].map((g) => {
            const gy = T + (ph / 2) * g;
            const lvV = Math.round(maxV - (maxV / 2) * g);
            const lvP = Math.round(maxP - (maxP / 2) * g);
            return (
              <g key={g}>
                <line
                  x1={L}
                  y1={gy}
                  x2={L + pw}
                  y2={gy}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray={g === 2 ? "0" : "3 4"}
                />
                {showV && (
                  <text x={L - 8} y={gy + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" style={{ fontSize: 10 }}>
                    {formatCompact(lvV)}
                  </text>
                )}
                {showP && (
                  <text x={L + pw + 8} y={gy + 4} textAnchor="start" fill="hsl(var(--muted-foreground))" style={{ fontSize: 10 }}>
                    {formatCompact(lvP)}
                  </text>
                )}
              </g>
            );
          })}

          {/* x-axis ticks */}
          {ticks.map((i) => (
            <text key={i} x={xAt(i)} y={H - 9} textAnchor="middle" fill="hsl(var(--muted-foreground))" style={{ fontSize: 10 }}>
              {fmtDay(series[i].day)}
            </text>
          ))}

          {/* pageview bars */}
          {showP &&
            series.map((d, i) => {
              const h = (d.pageviews / maxP) * ph;
              return (
                <rect
                  key={i}
                  x={xAt(i) - barW / 2}
                  y={T + ph - h}
                  width={barW}
                  height={Math.max(0, h)}
                  rx={2}
                  fill={P}
                  opacity={hover === i ? 0.75 : 0.5}
                />
              );
            })}

          {/* visitors area + line */}
          {showV && (
            <>
              <path d={areaD} fill="url(#tc-visitors)" />
              <path d={lineD} fill="none" stroke={V} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </>
          )}

          {/* hover guide + dots */}
          {hv && (
            <>
              <line x1={xAt(hover!)} y1={T} x2={xAt(hover!)} y2={T + ph} stroke="hsl(var(--border))" strokeWidth={1} />
              {showV && <circle cx={xAt(hover!)} cy={yV(hv.visitors)} r={3.5} fill={V} stroke="hsl(var(--card))" strokeWidth={2} />}
              {showP && <circle cx={xAt(hover!)} cy={yP(hv.pageviews)} r={3.5} fill={P} stroke="hsl(var(--card))" strokeWidth={2} />}
            </>
          )}
        </svg>

        {hv && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-1 rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg"
            style={{ left: `${tipLeftPct}%` }}
          >
            <div className="font-semibold">{fmtDay(hv.day)}</div>
            {showV && (
              <div className="mt-0.5 flex items-center gap-1.5 tabular-nums">
                <span className="size-2 rounded-[2px]" style={{ background: V }} /> {hv.visitors.toLocaleString()} visitors
              </div>
            )}
            {showP && (
              <div className="mt-0.5 flex items-center gap-1.5 tabular-nums">
                <span className="size-2 rounded-[2px]" style={{ background: P }} /> {hv.pageviews.toLocaleString()} pageviews
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LegendChip({
  on,
  color,
  label,
  sum,
  onClick,
}: {
  on: boolean;
  color: string;
  label: string;
  sum: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium transition-opacity"
      style={{ opacity: on ? 1 : 0.45 }}
    >
      <span className="h-2.5 w-3.5 rounded-[3px]" style={{ background: color }} />
      {label}
      <span className="tabular-nums text-muted-foreground">{formatCompact(sum)}</span>
    </button>
  );
}
