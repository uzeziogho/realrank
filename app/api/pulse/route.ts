import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Never cache — every hit is a distinct event.
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "rr_vid";
const SESSION_COOKIE = "rr_sid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const SESSION_MAX_AGE = 60 * 30; // 30 min (sliding)

// Obvious non-humans — keep the counters honest. The client beacon only fires
// from real page loads, but this endpoint is public, so we still filter.
const BOT_RE =
  /bot|crawl|spider|slurp|bing|google|facebook|embedly|preview|monitor|curl|wget|headless|lighthouse|pingdom|uptime|screenshot|whatsapp|telegram|discord|slack/i;

/**
 * First-party traffic beacon. Counts a page event against realrank.lol itself:
 * a new visitor (first-ever browser), a new session (30-min sliding), and a
 * pageview. No PII is stored — the ids live only in the caller's own cookies;
 * we persist counts only (see supabase/schema.sql: bump_site_traffic).
 */
export async function POST() {
  const res = new NextResponse(null, { status: 204 });

  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    if (BOT_RE.test(ua)) return res; // ignore bots, but 204 so the client is quiet

    const store = await cookies();
    const hasVisitor = Boolean(store.get(VISITOR_COOKIE)?.value);
    const hasSession = Boolean(store.get(SESSION_COOKIE)?.value);
    const newVisitor = !hasVisitor;
    const newSession = !hasSession;

    // Refresh the session cookie every hit (sliding window); mint a visitor id once.
    const common = {
      httpOnly: true as const,
      secure: true as const,
      sameSite: "lax" as const,
      path: "/",
    };
    if (newVisitor) {
      res.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), { ...common, maxAge: VISITOR_MAX_AGE });
    }
    res.cookies.set(SESSION_COOKIE, "1", { ...common, maxAge: SESSION_MAX_AGE });

    if (isSupabaseConfigured()) {
      const supabase = createServiceClient();
      const { error } = await supabase.rpc("bump_site_traffic", {
        new_visitor: newVisitor,
        new_session: newSession,
      });
      if (error) throw error;
    }
  } catch (err) {
    console.error("[pulse] beacon failed:", err);
    // Still return 204 — analytics must never break a page.
  }

  return res;
}
