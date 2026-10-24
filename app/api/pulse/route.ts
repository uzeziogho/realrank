import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import { classifyTraffic } from "@/lib/bot";

export const runtime = "nodejs";
// Never cache — every hit is a distinct event.
export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "rr_vid";
const SESSION_COOKIE = "rr_sid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const SESSION_MAX_AGE = 60 * 30; // 30 min (sliding)


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

    // Beacon body: the caller's own page path, referrer, utm_source and its
    // navigator.webdriver flag (if any). All optional; parsing never blocks the
    // count.
    let body: { path?: string; ref?: string; src?: string; wd?: boolean } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      /* no/invalid body — dimensions just default */
    }

    // Bots are counted, not dropped: a discarded hit can never be reported on
    // or re-filtered. The verdict routes the hit to the bot columns instead.
    const verdict = classifyTraffic({ ua, webdriver: body.wd === true });

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
      if (verdict.isBot) {
        const { error } = await supabase.rpc("bump_bot_traffic", {
          new_visitor: newVisitor,
          new_session: newSession,
          p_reason: verdict.reason ?? "",
        });
        if (error) throw error;
        // Bot hits stop here: the source/page/country/device breakdowns answer
        // "where do my visitors come from", and automated hits would skew them.
        return res;
      }

      const { error } = await supabase.rpc("bump_site_traffic", {
        new_visitor: newVisitor,
        new_session: newSession,
      });
      if (error) throw error;

      // Record where the visit came from — only once per session, so the counts
      // read as visits per source/page/country/device. Aggregate + privacy-safe.
      if (newSession) {
        const { error: bErr } = await supabase.rpc("bump_traffic_breakdown", {
          p_source: deriveSource(body.src, body.ref, ua, body.path),
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

const OWN_HOST_RE = /(^|\.)realrank\.lol$/i;

/**
 * Known in-app browsers that strip the referrer. Naming the app from the
 * user-agent keeps these visits out of the blind "Direct" bucket. Most common
 * first; the label carries the real host so it still gets a favicon.
 */
function inAppSource(ua: string): string | null {
  if (/instagram/i.test(ua)) return "instagram.com · in-app";
  if (/\bFBAN\b|\bFBAV\b|FB_IAB/i.test(ua)) return "facebook.com · in-app";
  if (/twitter/i.test(ua)) return "x.com · in-app";
  if (/tiktok|musical_ly|bytedancewebview/i.test(ua)) return "tiktok.com · in-app";
  if (/linkedinapp/i.test(ua)) return "linkedin.com · in-app";
  if (/pinterest/i.test(ua)) return "pinterest.com · in-app";
  if (/snapchat/i.test(ua)) return "snapchat.com · in-app";
  if (/\bLine\//.test(ua)) return "line · in-app";
  return null;
}

/**
 * Referrer/utm_source → a clean source label. An explicit utm_source wins; a
 * real external referrer becomes its host. Otherwise there's no referrer, which
 * most tools dump into one blind "Direct" bucket — instead we split it: an
 * in-app browser named from the UA, a "shared link" (no referrer but a deep
 * landing page, i.e. pasted into a chat/email/notes), or a genuine "typed or
 * bookmark" visit to the homepage.
 */
function deriveSource(src?: string, ref?: string, ua = "", path?: string): string {
  const s = (src ?? "").trim();
  if (s) return s.toLowerCase().slice(0, 64);
  const r = (ref ?? "").trim();
  if (r) {
    try {
      const host = new URL(r).hostname.replace(/^www\./i, "");
      if (host && !OWN_HOST_RE.test(host)) return host.slice(0, 64);
    } catch {
      /* unparseable referrer — fall through to the no-referrer split */
    }
  }
  const inApp = inAppSource(ua);
  if (inApp) return inApp;
  return derivePath(path) !== "/" ? "Direct · shared link" : "Direct · typed or bookmark";
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
