import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tracking-link redirect. /go/<slug> logs a click, then 302s to the channel's
 * destination with `?rr_click=<clickId>` appended. The founder's site forwards
 * that id into Stripe (client_reference_id) so revenue can be attributed back.
 *
 * The visitor is anonymous, so the click is written with the service role.
 * Obvious bots are redirected but not counted, to keep visit numbers honest.
 */
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|preview|monitor|curl|wget|headless|lighthouse/i;

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const home = new URL("/", siteConfig.url);

  if (!isSupabaseConfigured()) return NextResponse.redirect(home);

  const supabase = createServiceClient();
  const { data: channel } = await supabase
    .from("channels")
    .select("id, destination_url, archived")
    .eq("slug", slug)
    .maybeSingle();

  if (!channel || channel.archived) {
    return NextResponse.redirect(home);
  }

  // Build the destination up front so a logging failure never blocks the redirect.
  let target: URL;
  try {
    target = new URL(channel.destination_url);
  } catch {
    return NextResponse.redirect(home);
  }

  const ua = req.headers.get("user-agent") ?? "";
  const isBot = BOT_RE.test(ua);

  if (!isBot) {
    try {
      const referrer = req.headers.get("referer");
      const { data: click } = await supabase
        .from("channel_clicks")
        .insert({ channel_id: channel.id, referrer: referrer ?? null })
        .select("id")
        .single();
      if (click?.id) target.searchParams.set("rr_click", click.id);
    } catch {
      // Swallow — always redirect the visitor even if logging failed.
    }
  }

  const res = NextResponse.redirect(target, 302);
  res.headers.set("cache-control", "no-store");
  return res;
}
