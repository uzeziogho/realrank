import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAuthUrl } from "@/lib/google";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kick off the Google OAuth consent flow.
 * A random `state` is set as an httpOnly cookie and echoed back to Google for
 * CSRF protection; the callback verifies they match.
 *
 * Fails gracefully (redirect to /login with a reason) instead of throwing a 500
 * when configuration is incomplete.
 */
export async function GET() {
  const missing = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
  ].filter((k) => !process.env[k]);

  if (!isSupabaseConfigured() || missing.length > 0) {
    console.error("[oauth start] not configured; missing:", missing.join(", ") || "supabase env");
    return NextResponse.redirect(new URL("/login?error=not_configured", siteConfig.url));
  }

  try {
    const state = crypto.randomBytes(16).toString("hex");
    const url = getAuthUrl(state);

    const res = NextResponse.redirect(url);
    res.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (err) {
    console.error("[oauth start] failed to build auth URL:", err);
    return NextResponse.redirect(new URL("/login?error=start_failed", siteConfig.url));
  }
}
