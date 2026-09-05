import "server-only";

import { getLeaderboardData } from "@/lib/data";
import { getSiteProfileBySlug } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import { hostname } from "@/lib/utils";
import { categories } from "@/lib/config";
import type { RankedSite } from "@/lib/types";

/**
 * Read-only "agent" data layer powering the public MCP server. It exposes only
 * data that is already world-readable on the leaderboard — never the private
 * Channels / Stripe revenue tables (those are RLS-locked to each owner). The
 * moat is `verified_since` / `days_of_verified_history`: an unfakeable signal of
 * how long a site has had verified Search Console data.
 */

const MS_PER_DAY = 86_400_000;

export const CATEGORY_SLUGS: string[] = categories.map((c) => c.slug);

export interface LeaderRow {
  domain: string;
  rank: number;
  momentum_score: number;
  clicks_7d: number;
  clicks_28d: number;
  trend_direction: "up" | "down" | "flat";
  category: string | null;
  verified_since: string | null;
  days_of_verified_history: number;
  domain_rank: number | null;
}

export interface TrustProfile {
  domain: string;
  verified: boolean;
  /** Present only when unverified — a plain-English reason for the agent. */
  note?: string;
  verified_since?: string | null;
  days_of_verified_history?: number;
  momentum_score?: number;
  momentum_rank?: number;
  volume_rank?: number;
  category?: string | null;
  trend_direction?: "up" | "down" | "flat";
  founding?: boolean;
  total_sites?: number;
}

function trend(growthRate: number): "up" | "down" | "flat" {
  if (growthRate > 0.005) return "up";
  if (growthRate < -0.005) return "down";
  return "flat";
}

function daysSince(date: string | null): number {
  if (!date) return 0;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / MS_PER_DAY));
}

/** Normalize any domain-ish input to a bare lowercase hostname (no scheme/www/path). */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .trim();
}

/**
 * Earliest verified-click date per site, in one query. The first day GSC data
 * exists is the honest "verified since" — not when the row was created.
 */
async function earliestHistory(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!isSupabaseConfigured() || ids.length === 0) return map;
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("site_click_history")
      .select("site_id, date")
      .in("site_id", ids)
      .order("date", { ascending: true });
    if (error) throw error;
    for (const r of data ?? []) {
      if (!map.has(r.site_id)) map.set(r.site_id, r.date); // ascending → first seen = earliest
    }
  } catch (err) {
    console.error("[agent] earliestHistory failed:", err);
  }
  return map;
}

function verifiedSinceFor(
  site: RankedSite,
  usingDummyData: boolean,
  history: Map<string, string> | null,
): string | null {
  // Preview/seed mode has no real history — approximate from the join date.
  if (usingDummyData) return site.createdAt.slice(0, 10);
  return history?.get(site.id) ?? null;
}

function leaderRow(site: RankedSite, verifiedSince: string | null): LeaderRow {
  return {
    domain: hostname(site.siteUrl).toLowerCase(),
    rank: site.rank,
    momentum_score: site.momentumScore,
    clicks_7d: site.clicks7d,
    clicks_28d: site.clicks28d,
    trend_direction: trend(site.growthRate),
    category: site.category,
    verified_since: verifiedSince,
    days_of_verified_history: daysSince(verifiedSince),
    domain_rank: site.domainRank,
  };
}

export interface LeadersOptions {
  category?: string;
  limit?: number;
  sortBy?: "momentum" | "volume";
}

/** Top verified sites by momentum (default) or 28-day volume. */
export async function momentumLeaders(opts: LeadersOptions = {}): Promise<LeaderRow[]> {
  const view = opts.sortBy === "volume" ? "volume" : "momentum";
  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 10), 1), 50);
  const data = await getLeaderboardData(view, opts.category ? { category: opts.category } : {});
  const ranked = data.organic.filter((s) => !s.pending).slice(0, limit);
  const history = data.usingDummyData ? null : await earliestHistory(ranked.map((s) => s.id));
  return ranked.map((s) => leaderRow(s, verifiedSinceFor(s, data.usingDummyData, history)));
}

/** Verified trust profile for one domain. Degrades gracefully when unknown. */
export async function siteTrustProfile(domain: string): Promise<TrustProfile> {
  const slug = normalizeDomain(domain);
  const profile = await getSiteProfileBySlug(slug);
  if (!profile) {
    return {
      domain: slug,
      verified: false,
      note: "Not on RealRank — this domain hasn't connected Google Search Console, so there's no verified traffic to report.",
    };
  }
  const s = profile.site;
  const history = profile.usingDummyData ? null : await earliestHistory([s.id]);
  const verified_since = verifiedSinceFor(s, profile.usingDummyData, history);
  return {
    domain: hostname(s.siteUrl).toLowerCase(),
    verified: true,
    verified_since,
    days_of_verified_history: daysSince(verified_since),
    momentum_score: s.momentumScore,
    momentum_rank: s.rank,
    volume_rank: profile.volumeRank,
    category: s.category,
    trend_direction: trend(s.growthRate),
    founding: profile.founding,
    total_sites: profile.totalSites,
  };
}

/** Head-to-head trust profiles for 2+ domains. */
export async function compareSites(domains: string[]): Promise<TrustProfile[]> {
  const unique = Array.from(new Set(domains.map(normalizeDomain))).filter(Boolean).slice(0, 10);
  return Promise.all(unique.map((d) => siteTrustProfile(d)));
}

export interface TrendingOptions {
  category: string;
  minDaysVerified?: number;
}

/** Fastest-growing verified sites in a category, optionally gated by history length. */
export async function searchTrendingInCategory(opts: TrendingOptions): Promise<LeaderRow[]> {
  const data = await getLeaderboardData("momentum", { category: opts.category });
  const ranked = data.organic.filter((s) => !s.pending);
  const history = data.usingDummyData ? null : await earliestHistory(ranked.map((s) => s.id));
  let rows = ranked.map((s) => leaderRow(s, verifiedSinceFor(s, data.usingDummyData, history)));
  if (opts.minDaysVerified && opts.minDaysVerified > 0) {
    rows = rows.filter((r) => r.days_of_verified_history >= opts.minDaysVerified!);
  }
  return rows.slice(0, 25);
}
