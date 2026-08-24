import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAuthUrl } from "@/lib/google";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Kick off the Google OAuth consent flow.
 * A random `state` is set as an httpOnly cookie and echoed back to Google for
 * CSRF protection; the callback verifies they match.
 */
export async function GET() {
  if (!isSupabaseConfigured() || !process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "OAuth is not configured on this deployment." },
      { status: 501 },
    );
  }

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
}
