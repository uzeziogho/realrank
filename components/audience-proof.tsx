import { getSiteTrafficSeries, getOutboundClicks, getActiveSites } from "@/lib/data";
import { getListedSites } from "@/lib/listed";
import { formatCompact } from "@/lib/utils";

/**
 * The numbers a buyer asks first — "who will see this?" — on the Spotlight and
 * Sponsor pages. All first-party: human visitors to RealRank (bots excluded),
 * visits RealRank sent to listed sites, and how many sites are on the board and
 * in the directory. Each figure shows only above its floor, so a quiet month
 * never undersells the page; with nothing above the floor, nothing renders.
 */

const FLOORS = { visitors: 500, visitsSent: 50, sites: 10 };

export async function AudienceProof({ className }: { className?: string }) {
  const [series, sent, board, listed] = await Promise.all([
    getSiteTrafficSeries(30).catch(() => []),
    getOutboundClicks(30).catch(() => new Map<string, number>()),
    getActiveSites().catch(() => ({ sites: [], usingDummyData: false })),
    getListedSites().catch(() => []),
  ]);
  const visitors = series.reduce((n, d) => n + d.visitors, 0);
  const visitsSent = [...sent.values()].reduce((n, v) => n + v, 0);
  const sites = (board.usingDummyData ? 0 : board.sites.length) + listed.length;

  const stats = [
    visitors >= FLOORS.visitors && { value: formatCompact(visitors), label: "visitors in the last 30 days" },
    visitsSent >= FLOORS.visitsSent && { value: formatCompact(visitsSent), label: "visits sent to listed sites (30 days)" },
    sites >= FLOORS.sites && { value: formatCompact(sites), label: "sites on the board and in the directory" },
  ].filter(Boolean) as { value: string; label: string }[];
  if (stats.length === 0) return null;

  return (
    <dl
      className={
        className ??
        "mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 text-center [grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))]"
      }
      aria-label="Audience"
    >
      {stats.map((s) => (
        <div key={s.label}>
          <dt className="sr-only">{s.label}</dt>
          <dd className="text-2xl font-bold tabular-nums tracking-tight">{s.value}</dd>
          <dd className="text-xs text-muted-foreground">{s.label}</dd>
        </div>
      ))}
    </dl>
  );
}
