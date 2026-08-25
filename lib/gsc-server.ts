import "server-only";

import type { OAuth2Client } from "google-auth-library";
import { createServiceClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/crypto";
import { clientFromRefreshToken, listProperties } from "@/lib/google";

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
