import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, clientFromRefreshToken, listProperties, GSC_SCOPE } from "@/lib/google";
import { encryptToken } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OAuth callback. Verifies state, exchanges the code, encrypts the refresh
 * token, and stores it against the signed-in Supabase user. The refresh token
 * is NEVER returned to the client.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("oauth_state")?.value;

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/dashboard?error=${reason}`, siteConfig.url));

  if (!code) return fail("missing_code");
  if (!state || !cookieState || state !== cookieState) return fail("bad_state");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return fail("not_signed_in");

    const tokens = await exchangeCode(code);
    if (!tokens.refresh_token) {
      // Google only returns a refresh token on first consent; force re-consent.
      return fail("no_refresh_token");
    }

    // Read the connected Google account email for display.
    const client = clientFromRefreshToken(tokens.refresh_token);
    let googleEmail: string | null = null;
    try {
      const props = await listProperties(client);
      googleEmail = props[0] ?? null;
    } catch {
      // Non-fatal: we can still store the token.
    }

    const { error } = await supabase.from("connected_accounts").upsert(
      {
        user_id: user.id,
        provider: "google",
        google_email: googleEmail,
        encrypted_refresh_token: encryptToken(tokens.refresh_token),
        scope: tokens.scope ?? GSC_SCOPE,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
    if (error) throw error;

    const res = NextResponse.redirect(new URL("/dashboard?connected=1", siteConfig.url));
    res.cookies.delete("oauth_state");
    return res;
  } catch (err) {
    console.error("[oauth callback]", err);
    return fail("exchange_failed");
  }
}
