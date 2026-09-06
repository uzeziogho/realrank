import Link from "next/link";
import { MousePointerClick, Target, TrendingDown } from "lucide-react";
import { cn, formatCompact, hostname } from "@/lib/utils";
import type { LeakRow, SearchLeaks } from "@/lib/leaks";

/** Format a 0–1 ratio as a percentage with one decimal (e.g. 2.3%). */
function pct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function LeaksPanel({
  properties,
  selected,
  leaks,
}: {
  properties: string[];
  selected: string;
  leaks: SearchLeaks | null;
}) {
  return (
    <div className="space-y-8">
      {/* Property picker — one tab per verified Search Console property */}
      {properties.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {properties.map((p) => {
            const active = p === selected;
            return (
              <Link
                key={p}
                href={`/dashboard/leaks?site=${encodeURIComponent(p)}`}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {hostname(p) || p}
              </Link>
            );
          })}
        </div>
      )}

      {leaks === null ? (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t read Search Console for this property.
        </p>
      ) : (
        <>
          {/* Summary */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingDown className="size-4 text-primary" />
              Recoverable clicks (last {leaks.windowDays} days)
            </div>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {formatCompact(leaks.totalMissedClicks)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Estimated organic clicks you&apos;re leaving on the table on page-1
              rankings that under-perform their typical click-through rate.
            </p>
          </div>

          {/* CTR leaks */}
          <LeakTable
            icon={<MousePointerClick className="size-4 text-primary" />}
            title="Click-through leaks"
            subtitle="You rank on page 1 but earn far fewer clicks than the position usually gets — usually a weak title or meta description. Fix the snippet to recover the clicks."
            rows={leaks.ctrLeaks}
            emptyLabel="No significant click-through leaks — your page-1 snippets are pulling their weight."
            opportunityLabel="Recoverable"
          />

          {/* Striking distance */}
          <LeakTable
            icon={<Target className="size-4 text-primary" />}
            title="Striking distance"
            subtitle="Queries sitting just off page 1 (positions ~11–20) with real search volume. Small ranking gains here convert straight into clicks."
            rows={leaks.strikingDistance}
            emptyLabel="No high-volume page-2 queries right now."
            opportunityLabel="Potential"
          />

          <p className="text-xs text-muted-foreground">
            Based on verified Google Search Console data for {hostname(selected) || selected}.
            &ldquo;Recoverable&rdquo; and &ldquo;potential&rdquo; clicks are estimates from
            typical CTR-by-position benchmarks, not guarantees.
          </p>
        </>
      )}
    </div>
  );
}

function LeakTable({
  icon,
  title,
  subtitle,
  rows,
  emptyLabel,
  opportunityLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  rows: LeakRow[];
  emptyLabel: string;
  opportunityLabel: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Query</th>
                <th className="px-4 py-3 text-right font-medium">Impressions</th>
                <th className="px-4 py-3 text-right font-medium">Clicks</th>
                <th className="px-4 py-3 text-right font-medium">CTR</th>
                <th className="px-4 py-3 text-right font-medium">Pos.</th>
                <th className="px-4 py-3 text-right font-medium">{opportunityLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-accent/40">
                  <td className="max-w-[16rem] truncate px-4 py-3 font-medium text-foreground" title={r.key}>
                    {r.key}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {formatCompact(r.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {formatCompact(r.clicks)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {pct(r.ctr)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {r.position.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-primary">
                    +{formatCompact(r.opportunityClicks)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
