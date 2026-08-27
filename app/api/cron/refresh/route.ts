import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { clientFromRefreshToken, fetchSiteMetrics, fetchDailyClicks } from "@/lib/google";
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
    .select("id, user_id, site_url, momentum_score, clicks_28d")
    .eq("is_active", true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
      // Isolated: a history hiccup must not undo the metrics update above.
      try {
        const daily = await fetchDailyClicks(client, site.site_url, 90);
        if (daily.length > 0) {
          await supabase
            .from("site_click_history")
            .upsert(
              daily.map((d) => ({ site_id: site.id, date: d.date, clicks: d.clicks })),
              { onConflict: "site_id,date" },
            );
        }
      } catch (histErr) {
        const reason = histErr instanceof Error ? histErr.message : "unknown";
        failures.push({ site: `${site.site_url} (history)`, reason });
      }

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
  revalidatePath("/");
  for (const c of categories) revalidatePath(`/category/${c.slug}`);

  return NextResponse.json({
    ok: true,
    total: sites?.length ?? 0,
    updated,
    failed: failures.length,
    failures: failures.slice(0, 20),
    ranAt: new Date().toISOString(),
  });
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
