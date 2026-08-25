import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

/**
 * Refreshes the Supabase auth session cookie on navigation so Server Components
 * always see a valid session. No-op when Supabase isn't configured yet.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: req });

  if (!isSupabaseConfigured()) return res;

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Never let an auth/network hiccup 500 the whole site — session refresh is
  // best-effort here.
  try {
    await supabase.auth.getUser();
  } catch (err) {
    console.error("[middleware] session refresh failed:", err);
  }
  return res;
}

export const config = {
  matcher: [
    // Run on everything except static assets and the metadata files.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|og.png).*)",
  ],
};
