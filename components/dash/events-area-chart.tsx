"use client";

import { useRef, useState } from "react";
import type { EventDay } from "@/lib/data";
import { formatCompact } from "@/lib/utils";

/**
 * Daily feature-usage events as a polished single-series area chart: gridlines,
 * a date axis, and a per-day hover readout. Matches the /stats TrafficChart
 * treatment on the owner dashboard. Theme-aware (brand green via --cat-1).
 * Client component — the hover needs state.
 */
const C = "var(--cat-1)";

export function EventsAreaChart({ days }: { days: EventDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const series = days.filter((d) => d);
  if (!series.some((d) => d.hits > 0)) {
    return <p className="text-sm text-muted-foreground">Daily events will chart here as usage comes in.</p>;
  }

  const W = 760;
  const H = 220;
  const L = 42;
  const R = 14;
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
  const max = niceMax(Math.max(...series.map((d) => d.hits)));
  const xStep = pw / Math.max(1, n - 1);
  const xAt = (i: number) => L + xStep * i;
  const yAt = (v: number) => T + ph - (v / max) * ph;

  const lineD = series.map((d, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(d.hits).toFixed(1)}`).join(" ");
  const areaD = `${lineD} L${xAt(n - 1).toFixed(1)} ${T + ph} L${xAt(0).toFixed(1)} ${T + ph} Z`;

  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const ticks = n <= 1 ? [0] : [0, Math.round(n / 3), Math.round((2 * n) / 3), n - 1];

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let i = Math.round((x - L) / xStep);
    if (i < 0) i = 0;
    if (i > n - 1) i = n - 1;
    setHover(i);
  };

  const hv = hover != null ? series[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-52 w-full"
        role="img"
        aria-label={`Daily events over the last ${n} days`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="events-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C} stopOpacity={0.24} />
            <stop offset="100%" stopColor={C} stopOpacity={0} />
          </linearGradient>
        </defs>

        {[0, 1, 2].map((g) => {
          const gy = T + (ph / 2) * g;
          const lv = Math.round(max - (max / 2) * g);
          return (
            <g key={g}>
              <line x1={L} y1={gy} x2={L + pw} y2={gy} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray={g === 2 ? "0" : "3 4"} />
              <text x={L - 8} y={gy + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" style={{ fontSize: 10 }}>
                {formatCompact(lv)}
              </text>
            </g>
          );
        })}

        {ticks.map((i) => (
          <text key={i} x={xAt(i)} y={H - 9} textAnchor="middle" fill="hsl(var(--muted-foreground))" style={{ fontSize: 10 }}>
            {fmtDay(series[i].day)}
          </text>
        ))}

        <path d={areaD} fill="url(#events-area)" />
        <path d={lineD} fill="none" stroke={C} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

        {hv && (
          <>
            <line x1={xAt(hover!)} y1={T} x2={xAt(hover!)} y2={T + ph} stroke="hsl(var(--border))" strokeWidth={1} />
            <circle cx={xAt(hover!)} cy={yAt(hv.hits)} r={3.5} fill={C} stroke="hsl(var(--card))" strokeWidth={2} />
          </>
        )}
      </svg>

      {hv && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-1 rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg"
          style={{ left: `${(xAt(hover!) / W) * 100}%` }}
        >
          <div className="font-semibold">{fmtDay(hv.day)}</div>
          <div className="mt-0.5 tabular-nums">{hv.hits.toLocaleString()} events</div>
        </div>
      )}
    </div>
  );
}
