import "server-only";

import { getSearchLeaks, type LeakRow } from "@/lib/leaks";
import { categoryLabel } from "@/lib/config";
import type { RankedSite } from "@/lib/types";

/**
 * Two pieces of value only a verified board can give a site owner:
 *
 *  - Benchmark: how fast the site is growing compared with other verified
 *    sites, within its category when there are enough peers (else the whole
 *    board). Uses the board's growth rate (last 7 days vs the prior 21).
 *  - Opportunity: the single biggest win in the owner's own Search Console,
 *    from the same analysis as the Search leaks tab: a page-1 result whose
 *    click-through rate trails its position, or a page-2 query close to page 1.
 */

/** Peers needed for a comparison to mean anything. */
const MIN_PEERS = 4;
/** An opportunity below this many recoverable clicks a month isn't worth an email. */
const MIN_OPPORTUNITY_CLICKS = 3;

export interface Benchmark {
  /** Share of peers growing slower, 0–100. */
  percentile: number;
  /** How many other verified sites it was compared with. */
  peers: number;
  /** Category label when compared within its category; null for the whole board. */
  category: string | null;
}

export function benchmarkFor(site: RankedSite, board: RankedSite[]): Benchmark | null {
  if (site.pending) return null;
  const ranked = board.filter((r) => !r.pending && r.id !== site.id);
  const sameCat = site.category ? ranked.filter((r) => r.category === site.category) : [];
  const useCategory = sameCat.length >= MIN_PEERS;
  const peers = useCategory ? sameCat : ranked;
  if (peers.length < MIN_PEERS) return null;
  const slower = peers.filter((r) => r.growthRate < site.growthRate).length;
  return {
    percentile: Math.round((slower / peers.length) * 100),
    peers: peers.length,
    category: useCategory ? categoryLabel(site.category!) : null,
  };
}

/** "growing faster than 72% of verified SaaS sites" */
export function benchmarkText(b: Benchmark): string {
  const who = b.category ? `verified ${b.category} sites` : "verified sites on RealRank";
  return `Growing faster than ${b.percentile}% of ${who}`;
}

export interface Opportunity {
  kind: "ctr" | "page2";
  query: string;
  position: number;
  impressions: number;
  ctr: number;
  expectedCtr: number;
  /** Extra clicks a month (28 days) if it's fixed. */
  clicks: number;
}

function toOpportunity(kind: Opportunity["kind"], r: LeakRow): Opportunity {
  return {
    kind,
    query: r.key,
    position: r.position,
    impressions: r.impressions,
    ctr: r.ctr,
    expectedCtr: r.expectedCtr,
    clicks: r.opportunityClicks,
  };
}

/** The biggest single win in this property's Search Console, or null. */
export async function topOpportunity(userId: string, siteUrl: string): Promise<Opportunity | null> {
  try {
    const leaks = await getSearchLeaks(userId, siteUrl);
    if (!leaks?.hasData) return null;
    const candidates = [
      ...leaks.ctrLeaks.map((r) => toOpportunity("ctr", r)),
      ...leaks.strikingDistance.map((r) => toOpportunity("page2", r)),
    ].sort((a, b) => b.clicks - a.clicks);
    const best = candidates[0];
    return best && best.clicks >= MIN_OPPORTUNITY_CLICKS ? best : null;
  } catch (err) {
    console.error("[insights] opportunity failed:", err);
    return null;
  }
}

const pct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0).replace(/\.0$/, "")}%`;

/** A headline and one concrete next step, in plain words. */
export function opportunityText(o: Opportunity): { headline: string; detail: string } {
  const pos = Math.round(o.position);
  if (o.kind === "ctr") {
    return {
      headline: `“${o.query}”: about ${o.clicks} more clicks a month from a better title`,
      detail: `You rank around #${pos} for it and it was shown ${o.impressions.toLocaleString("en-US")} times in 28 days, but only ${pct(o.ctr)} clicked. Results at that position usually get about ${pct(o.expectedCtr)}. Rewrite the page's title and meta description so they answer that search directly.`,
    };
  }
  return {
    headline: `“${o.query}”: about ${o.clicks} more clicks a month if it reaches page 1`,
    detail: `It sits around #${pos}, on page 2, and was shown ${o.impressions.toLocaleString("en-US")} times in 28 days. Strengthen the page that ranks for it (answer the search more fully, add what's missing) and link to it from your other pages.`,
  };
}
