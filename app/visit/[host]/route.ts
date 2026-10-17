import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { siteConfig } from "@/lib/config";
import { classifyTraffic } from "@/lib/bot";
import { hostname, siteHref } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy outbound redirect, kept only so /visit/<host> links already out in the
 * world still land on the right site.
 *
 * Nothing on RealRank emits these any more: the board links straight at the
 * destination and reports the click through /api/visit, because the redirect hop
 * both stripped a dofollow link of its value and got /visit/<host> flagged by
 * SEO crawlers as a 302 + spam. So this now answers 301 (permanent, not a
 * temporary cloak) with x-robots-tag: noindex, so crawlers drop the URL instead
 * of re-flagging it. The destination is still resolved by matching <host>
 * against an ACTIVE published site, never against arbitrary input, so this can't
 * be used as an open redirect. Clicks are still counted for these stragglers;
 * obvious bots are redirected but not counted. Aggregate counts only
 * (site_outbound_clicks); no per-visitor data, no PII.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ host: string }> }) {
  const home = new URL("/", siteConfig.url);
  const { host } = await ctx.params;
  const wanted = decodeURIComponent(host).toLowerCase().replace(/^www\./, "");

  if (!isSupabaseConfigured() || !wanted) {
    return NextResponse.redirect(home);
  }

  const supabase = createServiceClient();

  // Resolve the destination from a known active site only (no open redirect).
  const { data: sites } = await supabase
    .from("published_sites")
    .select("site_url")
    .eq("is_active", true);

  const match = (sites ?? []).find(
    (s) => hostname(s.site_url).toLowerCase() === wanted,
  );
  if (!match) return NextResponse.redirect(home);

  let target: URL;
  try {
    target = new URL(siteHref(match.site_url));
  } catch {
    return NextResponse.redirect(home);
  }

  const isBot = classifyTraffic({ ua: req.headers.get("user-agent") }).isBot;
  if (!isBot) {
    try {
      await supabase.rpc("bump_outbound_click", { p_host: wanted });
    } catch {
      // Never block the redirect on a logging failure.
    }
  }

  const res = NextResponse.redirect(target, 301);
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-robots-tag", "noindex, nofollow");
  return res;
}
