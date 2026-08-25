import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, GSC_SCOPE } from "@/lib/google";
import { encryptToken } from "@/lib/crypto";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Single-step Google entry point: this one callback both SIGNS THE USER IN and
 * CONNECTS Search Console.
 *
 *  1. Verify CSRF state and exchange the auth code for tokens.
 *  2. Use the Google id_token to establish a Supabase session
 *     (signInWithIdToken) — no separate email/password step.
 *  3. Persist the encrypted GSC refresh token with the service-role client
 *     (connected_accounts has no user-facing insert policy) for the daily cron.
 *
 * The refresh token is NEVER returned to the client.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("oauth_state")?.value;

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, siteConfig.url));

  if (!code) return fail("missing_code");
  if (!state || !cookieState || state !== cookieState) return fail("bad_state");

  try {
    const tokens = await exchangeCode(code);
    if (!tokens.id_token) return fail("no_id_token");

    // Sign in (or create the account) from the Google identity token.
    const supabase = await createClient();
    const { data: authData, error: authError } =
      await supabase.auth.signInWithIdToken({
        provider: "google",
        token: tokens.id_token,
      });
    if (authError || !authData.user) {
      console.error("[oauth callback] signInWithIdToken failed:", authError);
      return fail("signin_failed");
    }
    const user = authData.user;

    // Store the encrypted refresh token for background refresh. Google returns it
    // on the consent we force with prompt=consent; if absent, keep any existing one.
    if (tokens.refresh_token) {
      const admin = createServiceClient();
      const { error } = await admin.from("connected_accounts").upsert(
        {
          user_id: user.id,
          provider: "google",
          google_email: user.email ?? null,
          encrypted_refresh_token: encryptToken(tokens.refresh_token),
          scope: tokens.scope ?? GSC_SCOPE,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" },
      );
      if (error) console.error("[oauth callback] token store failed:", error);
    }

    const res = NextResponse.redirect(
      new URL("/dashboard?connected=1", siteConfig.url),
    );
    res.cookies.delete("oauth_state");
    return res;
  } catch (err) {
    console.error("[oauth callback]", err);
    return fail("exchange_failed");
  }
}
