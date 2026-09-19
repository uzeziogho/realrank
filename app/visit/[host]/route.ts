import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { siteConfig } from "@/lib/config";
import { hostname, siteHref } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Outbound click tracker. /visit/<host> logs one click-through, then 302s to the
 * listed site's real URL. The destination is resolved by matching <host> against
 * an ACTIVE published site (never against arbitrary input), so this can't be used
 * as an open redirect. Obvious bots are redirected but not counted, to keep the
 * numbers honest. Aggregate counts only (site_outbound_clicks); no per-visitor
 * data, no PII. Not yet surfaced in ranking — this just accumulates the data.
 */
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|preview|monitor|curl|wget|headless|lighthouse/i;

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

  const isBot = BOT_RE.test(req.headers.get("user-agent") ?? "");
  if (!isBot) {
    try {
      await supabase.rpc("bump_outbound_click", { p_host: wanted });
    } catch {
      // Never block the redirect on a logging failure.
    }
  }

  const res = NextResponse.redirect(target, 302);
  res.headers.set("cache-control", "no-store");
  return res;
}
