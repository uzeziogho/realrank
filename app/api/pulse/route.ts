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
export async function POST(req: Request) {
  const res = new NextResponse(null, { status: 204 });

  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    if (BOT_RE.test(ua)) return res; // ignore bots, but 204 so the client is quiet

    // Beacon body: the caller's own page path, referrer, and utm_source (if any).
    // All optional; parsing never blocks the count.
    let body: { path?: string; ref?: string; src?: string } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      /* no/invalid body — dimensions just default */
    }

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

      // Record where the visit came from — only once per session, so the counts
      // read as visits per source/page/country/device. Aggregate + privacy-safe.
      if (newSession) {
        const { error: bErr } = await supabase.rpc("bump_traffic_breakdown", {
          p_source: deriveSource(body.src, body.ref),
          p_path: derivePath(body.path),
          p_country: (h.get("x-vercel-ip-country") || "Unknown").toUpperCase().slice(0, 2),
          p_device: deviceClass(ua),
        });
        if (bErr) throw bErr;
      }
    }
  } catch (err) {
    console.error("[pulse] beacon failed:", err);
    // Still return 204 — analytics must never break a page.
  }

  return res;
}

/** Referrer/utm_source → a clean source label. Internal/no referrer = Direct. */
const OWN_HOST_RE = /(^|\.)realrank\.lol$/i;

function deriveSource(src?: string, ref?: string): string {
  const s = (src ?? "").trim();
  if (s) return s.toLowerCase().slice(0, 64);
  const r = (ref ?? "").trim();
  if (!r) return "Direct";
  try {
    const host = new URL(r).hostname.replace(/^www\./i, "");
    if (!host || OWN_HOST_RE.test(host)) return "Direct";
    return host.slice(0, 64);
  } catch {
    return "Direct";
  }
}

/** The caller's own path, stripped of query/hash and trailing slash. */
function derivePath(path?: string): string {
  let p = (path ?? "/").trim();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.split("?")[0].split("#")[0];
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p.slice(0, 128) || "/";
}

/** Coarse device class from the user-agent. */
function deviceClass(ua: string): string {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "Tablet";
  if (/mobi|iphone|android.*mobile|phone/i.test(ua)) return "Mobile";
  return "Desktop";
}
