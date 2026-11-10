import type { RankedSite } from "@/lib/types";
import { hostname } from "@/lib/utils";

/**
 * Indexability rules for templated pages, shared by each page's metadata and by
 * the sitemap so the two can never disagree: a page that noindexes itself must
 * never be submitted, and a submitted page must never noindex itself.
 *
 * Only sites with real data count — "pending" rows (no clicks in the window)
 * render on boards but add nothing a searcher would want.
 */

/** A category board (/category/<slug>) needs this many ranked sites to be indexable. */
export const MIN_RANKED_FOR_CATEGORY = 3;

/** A "Top <site> alternatives" page needs this many ranked peers to be indexable. */
export const MIN_ALTERNATIVES = 3;

/** How many same-category compare pairs the sitemap seeds. */
export const MAX_COMPARE_PAIRS = 40;

const slugOf = (s: RankedSite) => hostname(s.siteUrl).toLowerCase();

/** Sites with real data (not pending). */
export function rankedOnly(sites: RankedSite[]): RankedSite[] {
  return sites.filter((s) => !s.pending);
}

/** Ranked-site count per category. */
export function rankedCountsByCategory(sites: RankedSite[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of rankedOnly(sites)) if (s.category) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  return counts;
}

/**
 * How many alternatives the /alternatives/<slug> page would list for each site:
 * ranked same-category peers (or the whole board for uncategorised sites),
 * excluding the site itself. Mirrors the page's own peer query.
 */
export function alternativeCounts(board: RankedSite[]): Map<string, number> {
  const ranked = rankedOnly(board);
  const byCategory = rankedCountsByCategory(board);
  const out = new Map<string, number>();
  for (const s of board) {
    const pool = s.category ? (byCategory.get(s.category) ?? 0) : ranked.length;
    out.set(slugOf(s), pool - (s.pending ? 0 : 1));
  }
  return out;
}

/** One canonical slug per pair, whichever order it was requested in. */
export function canonicalPair(a: string, b: string): string {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()].sort();
  return `${x}-vs-${y}`;
}

/**
 * A head-to-head page is worth indexing only when it's a real comparison: both
 * sites have data and compete in the same category. Anything else (an arbitrary
 * pair, or a site with no clicks) renders for visitors but stays out of the index.
 */
export function isIndexablePair(
  a: { category: string | null; pending: boolean },
  b: { category: string | null; pending: boolean },
): boolean {
  return !a.pending && !b.pending && a.category !== null && a.category === b.category;
}

/** Same-category neighbours on the momentum board — pairs people actually compare. */
export function seedComparePairs(board: RankedSite[], max = MAX_COMPARE_PAIRS): string[] {
  const byCategory = new Map<string, RankedSite[]>();
  for (const s of rankedOnly(board)) {
    if (!s.category) continue;
    const list = byCategory.get(s.category) ?? [];
    list.push(s);
    byCategory.set(s.category, list);
  }
  const pairs = new Set<string>();
  // Round-robin across categories so one big category can't take every slot.
  const lists = [...byCategory.values()];
  for (let i = 0; pairs.size < max; i++) {
    let added = false;
    for (const list of lists) {
      if (i + 1 >= list.length) continue;
      pairs.add(canonicalPair(slugOf(list[i]), slugOf(list[i + 1])));
      added = true;
      if (pairs.size >= max) break;
    }
    if (!added) break;
  }
  return [...pairs];
}
