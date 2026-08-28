import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

/**
 * Refreshes the Supabase auth session cookie so the dashboard's Server
 * Components see a valid session.
 *
 * IMPORTANT: this must NOT run on public routes. `getUser()` makes a blocking
 * network call to Supabase; running it on every request (including anonymous
 * visitors and crawlers, who have no session) risks a MIDDLEWARE_INVOCATION_
 * TIMEOUT that 504s the entire site. So the matcher below is scoped to the
 * authenticated area only, we short-circuit when there's no auth cookie, and
 * the call is capped with a timeout as a final safety net.
 */
const AUTH_TIMEOUT_MS = 3000;

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  if (!isSupabaseConfigured()) return res;

  // Anonymous request (no Supabase auth cookie) → nothing to refresh. Skip the
  // network call entirely.
  const hasAuthCookie = req.cookies.getAll().some((c) => c.name.includes("-auth-token"));
  if (!hasAuthCookie) return res;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  // Best-effort, and bounded: a slow/unreachable auth server must never hang the
  // invocation to the platform limit.
  try {
    await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("auth timeout")), AUTH_TIMEOUT_MS)),
    ]);
  } catch (err) {
    console.error("[middleware] session refresh skipped:", err);
  }
  return res;
}

export const config = {
  // Scope to the authenticated area only. Public pages (home, leaderboard,
  // blog, site profiles, categories) render the logged-out state for crawlers
  // by design and need no session refresh — keeping middleware off them keeps
  // the public site fast and immune to auth-server latency.
  matcher: ["/dashboard/:path*"],
};
