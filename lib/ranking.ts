import type { PublishedSite, SponsoredSlot } from "@/lib/supabase/types";
import {
  type LeaderboardRow,
  type RankedSite,
  toRankedSite,
  toSponsoredRow,
} from "@/lib/types";
import type { RankingView } from "@/lib/config";

/**
 * Sort active sites by the selected view and assign 1-based ranks.
 * Sponsored placements are NOT included here — they never affect organic scores.
 */
export function rankSites(sites: PublishedSite[], view: RankingView): RankedSite[] {
  const active = sites.filter((s) => s.is_active);

  const sorted = [...active].sort((a, b) => {
    if (view === "volume") {
      return b.clicks_28d - a.clicks_28d || b.momentum_score - a.momentum_score;
    }
    // momentum (default)
    return b.momentum_score - a.momentum_score || b.clicks_7d - a.clicks_7d;
  });

  return sorted.map((site, i) => toRankedSite(site, i + 1));
}

/**
 * Interleave sponsored rows AFTER the given organic ranks (default #10 and #20).
 * Ads are clearly marked in the UI and are appended positionally, not scored.
 */
export function injectSponsored(
  ranked: RankedSite[],
  slots: SponsoredSlot[],
): LeaderboardRow[] {
  const activeSlots = slots.filter(isSlotLive);
  const byRank = new Map<number, SponsoredSlot[]>();
  for (const slot of activeSlots) {
    const list = byRank.get(slot.position_after_rank) ?? [];
    list.push(slot);
    byRank.set(slot.position_after_rank, list);
  }

  const out: LeaderboardRow[] = [];
  for (const row of ranked) {
    out.push(row);
    const ads = byRank.get(row.rank);
    if (ads) {
      for (const ad of ads) out.push(toSponsoredRow(ad));
    }
  }
  return out;
}

function isSlotLive(slot: SponsoredSlot): boolean {
  if (!slot.is_active) return false;
  const now = Date.now();
  if (slot.starts_at && new Date(slot.starts_at).getTime() > now) return false;
  if (slot.ends_at && new Date(slot.ends_at).getTime() < now) return false;
  return true;
}

/** The most recent refresh timestamp across all sites, for the "Last updated" label. */
export function latestRefresh(sites: PublishedSite[]): string | null {
  let latest: number | null = null;
  for (const s of sites) {
    if (!s.last_refreshed_at) continue;
    const t = new Date(s.last_refreshed_at).getTime();
    if (latest === null || t > latest) latest = t;
  }
  return latest === null ? null : new Date(latest).toISOString();
}
