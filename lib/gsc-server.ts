import "server-only";

import type { OAuth2Client } from "google-auth-library";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { clientFromRefreshToken, listProperties, fetchDailyClicks } from "@/lib/google";

/**
 * Builds a GSC-authorized OAuth client for a given user by reading their
 * encrypted refresh token with the service-role client (bypasses RLS, keeps the
 * token server-side) and decrypting it. Returns null if the user hasn't
 * connected Google or the token can't be decrypted.
 */
export async function getUserGscClient(userId: string): Promise<OAuth2Client | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("connected_accounts")
    .select("encrypted_refresh_token")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (!data?.encrypted_refresh_token) return null;
  try {
    return clientFromRefreshToken(decryptToken(data.encrypted_refresh_token));
  } catch {
    return null;
  }
}

/**
 * Backfill/refresh a site's daily click history (last `days` days) from Search
 * Console into site_click_history. Uses the service role (end users have no
 * write policy on that table). Upserts on (site_id, date) so it's safe to call
 * on every publish AND on every cron run. Never throws — logs and returns the
 * number of days written so callers can proceed regardless.
 */
export async function upsertSiteHistory(
  siteId: string,
  client: OAuth2Client,
  siteUrl: string,
  days = 90,
): Promise<number> {
  try {
    const daily = await fetchDailyClicks(client, siteUrl, days);
    if (daily.length === 0) return 0;
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("site_click_history")
      .upsert(
        daily.map((d) => ({ site_id: siteId, date: d.date, clicks: d.clicks })),
        { onConflict: "site_id,date" },
      );
    if (error) throw error;
    return daily.length;
  } catch (err) {
    console.error("[gsc] history backfill failed:", err);
    return 0;
  }
}

/** Lists the user's verified GSC properties, or [] on any error/quota issue. */
export async function listUserProperties(userId: string): Promise<string[]> {
  const client = await getUserGscClient(userId);
  if (!client) return [];
  try {
    return await listProperties(client);
  } catch (err) {
    console.error("[gsc] listProperties failed:", err);
    return [];
  }
}
