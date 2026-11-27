import { Suspense } from "react";
import Link from "next/link";
import { Lightbulb, Users, ArrowRight, Loader2 } from "lucide-react";
import { benchmarkFor, benchmarkText, opportunityText, topOpportunity } from "@/lib/insights";
import type { RankedSite } from "@/lib/types";

/**
 * "This week" on the owner dashboard: how each ranked site's growth compares
 * with other verified sites, and the single biggest opportunity in the lead
 * site's Search Console. The opportunity needs a live Search Console read, so
 * it streams in behind a Suspense boundary and never slows the page.
 */
export function WeeklyInsights({
  userId,
  rows,
  board,
  propertyFor,
}: {
  userId: string;
  /** This owner's sites on the board. */
  rows: RankedSite[];
  /** The whole board, for the comparison. */
  board: RankedSite[];
  /** Search Console property for a board row (by id). */
  propertyFor: Record<string, string>;
}) {
  const ranked = rows.filter((r) => !r.pending).sort((a, b) => a.rank - b.rank);
  if (ranked.length === 0) return null;
  const lead = ranked[0];
  const benchmarks = ranked
    .map((r) => ({ row: r, b: benchmarkFor(r, board) }))
    .filter((x): x is { row: RankedSite; b: NonNullable<ReturnType<typeof benchmarkFor>> } => Boolean(x.b));

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold">This week</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-primary" /> How you compare
          </p>
          {benchmarks.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Comparisons appear once there are a few more verified sites to compare with.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-4">
              {benchmarks.map(({ row, b }) => (
                <li key={row.id}>
                  <p className="text-sm">
                    <span className="font-medium">{row.displayName}</span>
                    <span className="text-muted-foreground"> · {benchmarkText(b)}</span>
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, b.percentile)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Growth over the last 7 days vs the 21 before, compared with {b.peers} verified{" "}
                    {b.category ? `${b.category} ` : ""}sites.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Suspense fallback={<OpportunityShell loading />}>
          {propertyFor[lead.id] ? (
            <OpportunityCard userId={userId} property={propertyFor[lead.id]} siteName={lead.displayName} />
          ) : (
            <OpportunityShell />
          )}
        </Suspense>
      </div>
    </section>
  );
}

async function OpportunityCard({ userId, property, siteName }: { userId: string; property: string; siteName: string }) {
  const o = await topOpportunity(userId, property);
  if (!o) {
    return (
      <OpportunityShell>
        <p className="mt-3 text-sm text-muted-foreground">
          No standout opportunity for {siteName} this week. Nothing on page 1 is badly under-clicked, and nothing on
          page 2 has enough searches to chase yet.
        </p>
      </OpportunityShell>
    );
  }
  const t = opportunityText(o);
  return (
    <OpportunityShell>
      <p className="mt-1 text-xs text-muted-foreground">{siteName}</p>
      <p className="mt-2 font-medium">{t.headline}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t.detail}</p>
    </OpportunityShell>
  );
}

function OpportunityShell({ loading = false, children }: { loading?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-5">
      <p className="inline-flex items-center gap-2 text-sm font-medium">
        <Lightbulb className="size-4 text-amber-600 dark:text-amber-400" /> This week&apos;s opportunity
      </p>
      {loading ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Reading your Search Console…
        </p>
      ) : (
        children ?? (
          <p className="mt-3 text-sm text-muted-foreground">Connect Google again to see opportunities for this site.</p>
        )
      )}
      <Link href="/dashboard/leaks" className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary hover:underline">
        All opportunities <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
