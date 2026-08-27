import type { PublishedSite, SponsoredSlot } from "@/lib/supabase/types";
import type { RankingView } from "@/lib/config";

export type { RankingView };

/** A public-facing site row after ranking, safe to render (no user_id/internal ids leaked in UI). */
export interface RankedSite {
  kind: "organic";
  rank: number;
  id: string;
  siteUrl: string;
  displayName: string;
  description: string | null;
  category: string | null;
  clicks7d: number;
  clicks28d: number;
  momentumScore: number;
  growthRate: number;
  lastRefreshedAt: string | null;
  /** Positions gained (+) or lost (−) since the previous refresh; null = new entrant. */
  rankDelta: number | null;
  /** Compact recent daily-click series for the row sparkline (ascending). */
  spark: number[];
}

/** A sponsored placement row, visually distinct and excluded from scoring. */
export interface SponsoredRow {
  kind: "sponsored";
  id: string;
  displayName: string;
  siteUrl: string;
  description: string | null;
  ctaLabel: string | null;
  /** The organic rank this ad is displayed after. */
  afterRank: number;
}

export type LeaderboardRow = RankedSite | SponsoredRow;

export function toRankedSite(
  site: PublishedSite,
  rank: number,
  rankDelta: number | null = null,
): RankedSite {
  return {
    kind: "organic",
    rank,
    id: site.id,
    siteUrl: site.site_url,
    displayName: site.display_name,
    description: site.description,
    category: site.category,
    clicks7d: site.clicks_7d,
    clicks28d: site.clicks_28d,
    momentumScore: site.momentum_score,
    growthRate: site.growth_rate,
    lastRefreshedAt: site.last_refreshed_at,
    rankDelta,
    spark: [],
  };
}

export function toSponsoredRow(slot: SponsoredSlot): SponsoredRow {
  return {
    kind: "sponsored",
    id: slot.id,
    displayName: slot.display_name,
    siteUrl: slot.site_url,
    description: slot.description,
    ctaLabel: slot.cta_label,
    afterRank: slot.position_after_rank,
  };
}
