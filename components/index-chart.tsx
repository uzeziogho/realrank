"use client";

import { useRef, useState } from "react";
import type { IndexPoint } from "@/lib/stats";

/**
 * The RealRank Index over time: one series, with the 100 = flat baseline drawn
 * as a reference so "above/below the line" reads at a glance. Days below the
 * privacy floor (too few qualifying sites) render as a gap, never a guess.
 * Hover anywhere for a crosshair readout of that day.
 */
const C = "var(--cat-1)";

export function IndexChart({ points }: { points: IndexPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const values = points.map((p) => p.index).filter((v): v is number => v !== null);

  if (values.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
        The Index history charts here once enough sites have a full 28 days of verified clicks.
      </div>
    );
  }

  const W = 760;
  const H = 240;
  const L = 40;
  const R = 12;
  const T = 14;
  const B = 28;
  const pw = W - L - R;
  const ph = H - T - B;
  const n = points.length;

  // A domain that always contains the 100 baseline, padded, with gridlines on a
  // round step (1/2/5/10/20/50…) so labels read 95, 100, 105 — never 97, 93.
  const rawLo = Math.min(100, ...values) - 1;
  const rawHi = Math.max(100, ...values) + 1;
  const step = [1, 2, 5, 10, 20, 50, 100, 200].find((s) => (rawHi - rawLo) / s <= 5) ?? 500;
  const lo = Math.floor(rawLo / step) * step;
  const hi = Math.ceil(rawHi / step) * step;
  const xAt = (i: number) => L + (n === 1 ? pw / 2 : (pw * i) / (n - 1));
  const yAt = (v: number) => T + ph - ((v - lo) / (hi - lo)) * ph;

  // Path with gaps: a new "M" after every null.
  let d = "";
  let pen = false;
  points.forEach((p, i) => {
    if (p.index === null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(p.index).toFixed(1)} `;
    pen = true;
  });

  const grid: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) grid.push(Math.round(v));
  const fmtDay = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const ticks = n <= 1 ? [0] : [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1];

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    setHover(Math.min(n - 1, Math.max(0, Math.round(((x - L) / pw) * (n - 1)))));
  };

  const hp = hover !== null ? points[hover] : null;
  const last = [...points].reverse().find((p) => p.index !== null)!;
  const lastI = points.lastIndexOf(last);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-56 w-full touch-none"
          role="img"
          aria-label={`The RealRank Index over the last ${n} days, now ${last.index}`}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {grid.map((v) => (
            <g key={v}>
              <line
                x1={L}
                x2={L + pw}
                y1={yAt(v)}
                y2={yAt(v)}
                stroke="hsl(var(--border))"
                strokeWidth={1}
                strokeDasharray={v === 100 ? "0" : "3 4"}
              />
              <text x={L - 8} y={yAt(v) + 4} textAnchor="end" fill="hsl(var(--muted-foreground))" style={{ fontSize: 10 }}>
                {v}
              </text>
            </g>
          ))}
          <text x={L + pw} y={yAt(100) - 6} textAnchor="end" fill="hsl(var(--muted-foreground))" style={{ fontSize: 10 }}>
            100 = flat
          </text>

          {ticks.map((i) => (
            <text key={i} x={xAt(i)} y={H - 9} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fill="hsl(var(--muted-foreground))" style={{ fontSize: 10 }}>
              {fmtDay(points[i].date)}
            </text>
          ))}

          <path d={d} fill="none" stroke={C} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

          {/* Latest reading, labelled directly. */}
          <circle cx={xAt(lastI)} cy={yAt(last.index!)} r={4} fill={C} stroke="hsl(var(--card))" strokeWidth={2} />

          {hp && (
            <>
              <line x1={xAt(hover!)} x2={xAt(hover!)} y1={T} y2={T + ph} stroke="hsl(var(--muted-foreground))" strokeOpacity={0.4} strokeWidth={1} />
              {hp.index !== null && (
                <circle cx={xAt(hover!)} cy={yAt(hp.index)} r={4} fill={C} stroke="hsl(var(--card))" strokeWidth={2} />
              )}
            </>
          )}
        </svg>

        {hp && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-1 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg"
            style={{ left: `${Math.min(88, Math.max(12, (xAt(hover!) / W) * 100))}%` }}
          >
            <div className="font-semibold">{fmtDay(hp.date)}</div>
            <div className="mt-0.5 tabular-nums">
              {hp.index !== null ? (
                <>
                  Index <span className="font-semibold">{hp.index}</span> · {hp.sites} sites
                </>
              ) : (
                "Too few qualifying sites"
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table view for screen readers and anyone who wants the numbers. */}
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="inline-block cursor-pointer select-none py-2 hover:text-foreground">Show the data</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th className="px-3 py-1.5 font-medium">Day</th>
                <th className="px-3 py-1.5 font-medium">Index</th>
                <th className="px-3 py-1.5 font-medium">Sites</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.date} className="border-t border-border/60">
                  <td className="px-3 py-1">{p.date}</td>
                  <td className="px-3 py-1">{p.index ?? "—"}</td>
                  <td className="px-3 py-1">{p.sites}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
