import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { LEADERBOARD_TAG } from "@/lib/data";
import { decryptToken } from "@/lib/crypto";
import { clientFromRefreshToken, fetchSiteMetrics } from "@/lib/google";
import { upsertSiteHistory } from "@/lib/gsc-server";
import { fetchDomainRatings } from "@/lib/domainrating";
import { hostname } from "@/lib/utils";
import { categories } from "@/lib/config";
import type { OAuth2Client } from "google-auth-library";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Give the batch room to run on Vercel.
export const maxDuration = 300;

/**
 * Scheduled data refresh (Vercel Cron, every 6–12h).
 *
 * For each active published site, re-fetch 7d/28d clicks from GSC, recompute the
 * momentum score, and persist. Errors are isolated per-site so one bad token or
 * quota hit never fails the whole run. On-demand revalidation runs at the end.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Pull active sites and the encrypted token for each owner.
  const { data: sites, error } = await supabase
    .from("published_sites")
    .select("id, user_id, site_url, momentum_score, clicks_28d, domain_rank_at")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Domain Rating (Ahrefs, 0–100) via AnyAPI. Per-domain, paid, and slow, so we
  // only refresh sites missing a rating or older than a week, capped per run —
  // DR moves slowly, so this covers the board over a few runs at trivial cost.
  const drRefreshed = await refreshDomainRatings(supabase, sites ?? []);

  const clientCache = new Map<string, OAuth2Client | null>();
  let updated = 0;
  const failures: { site: string; reason: string }[] = [];

  for (const site of sites ?? []) {
    try {
      const client = await getClientForUser(supabase, site.user_id, clientCache);
      if (!client) {
        failures.push({ site: site.site_url, reason: "no_token" });
        continue;
      }

      const metrics = await fetchSiteMetrics(client, site.site_url);
      const { error: upErr } = await supabase
        .from("published_sites")
        .update({
          ...metrics,
          // Snapshot the outgoing values so the UI can show rank movement.
          previous_momentum_score: site.momentum_score,
          previous_clicks_28d: site.clicks_28d,
          last_refreshed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", site.id);

      if (upErr) throw upErr;
      updated += 1;

      // Backfill/refresh daily click history (last 90 days) for the timeline.
      // Best-effort inside upsertSiteHistory: never undoes the metrics update.
      await upsertSiteHistory(site.id, client, site.site_url, 90);

      // Gentle pacing to respect GSC per-minute quotas.
      await sleep(150);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";
      failures.push({ site: site.site_url, reason });
      // Back off a little harder on quota / rate-limit errors.
      if (/quota|rate|429/i.test(reason)) await sleep(2000);
    }
  }

  // On-demand revalidation so the public pages pick up fresh numbers immediately.
  revalidateTag(LEADERBOARD_TAG); // bust the cached board read
  revalidatePath("/");
  for (const c of categories) revalidatePath(`/category/${c.slug}`);

  return NextResponse.json({
    ok: true,
    total: sites?.length ?? 0,
    updated,
    drRefreshed,
    failed: failures.length,
    failures: failures.slice(0, 20),
    ranAt: new Date().toISOString(),
  });
}

/** A DR fetch is stale after this many days; refresh at most this many per run. */
const DR_STALE_DAYS = 7;
const DR_MAX_PER_RUN = 15;

/**
 * Refresh Domain Rating for the active sites that most need it — those missing a
 * rating or last checked over a week ago — capped per run because the Ahrefs
 * endpoint is paid and slow. Stamps `domain_rank_at` on every attempt (even a
 * miss) so a not-found domain isn't re-billed every run; only writes the value
 * when one comes back. Returns how many domains were refreshed with a value.
 */
async function refreshDomainRatings(
  supabase: ReturnType<typeof createServiceClient>,
  sites: { id: string; site_url: string; domain_rank_at: string | null }[],
): Promise<number> {
  const cutoff = Date.now() - DR_STALE_DAYS * 86_400_000;
  const targets = sites
    .filter((s) => !s.domain_rank_at || new Date(s.domain_rank_at).getTime() < cutoff)
    .slice(0, DR_MAX_PER_RUN);
  if (targets.length === 0) return 0;

  const ratings = await fetchDomainRatings(targets.map((s) => hostname(s.site_url)));
  const now = new Date().toISOString();
  let written = 0;
  for (const s of targets) {
    const dr = ratings.get(hostname(s.site_url));
    await supabase
      .from("published_sites")
      .update({ ...(dr != null ? { domain_rank: dr } : {}), domain_rank_at: now })
      .eq("id", s.id);
    if (dr != null) written += 1;
  }
  return written;
}

async function getClientForUser(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  cache: Map<string, OAuth2Client | null>,
): Promise<OAuth2Client | null> {
  if (cache.has(userId)) return cache.get(userId)!;

  const { data } = await supabase
    .from("connected_accounts")
    .select("encrypted_refresh_token")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  let client: OAuth2Client | null = null;
  if (data?.encrypted_refresh_token) {
    try {
      client = clientFromRefreshToken(decryptToken(data.encrypted_refresh_token));
    } catch {
      client = null;
    }
  }
  cache.set(userId, client);
  return client;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
