import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Magic-link / OAuth callback. Supabase redirects here with a `?code=`; we
 * exchange it for a session cookie (PKCE) and send the user to their dashboard.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, siteConfig.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", siteConfig.url));
}
