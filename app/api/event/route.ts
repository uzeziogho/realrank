import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import { classifyTraffic } from "@/lib/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


/**
 * Named feature-usage events (Umami-style custom events). Fire-and-forget from
 * the client via `track()`. Stores aggregate counts only (no PII, no
 * per-visitor rows) in site_events. Always 204 so analytics can't break UX.
 */
export async function POST(req: Request) {
  const res = new NextResponse(null, { status: 204 });
  try {
    const h = await headers();
    // Same bot definition as the pulse beacon (lib/bot.ts). Feature-usage
    // events from bots are dropped rather than counted: site_events answers
    // "which features do people use", and there is no bot dimension to file
    // them under. The traffic counters classify instead, because the bot share
    // of traffic is itself worth reporting.
    if (classifyTraffic({ ua: h.get("user-agent") }).isBot) return res;

    let body: { event?: string; label?: string } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return res; // no/invalid body — nothing to record
    }
    const event = (body.event ?? "").trim().slice(0, 64);
    if (!event) return res;
    const label = (body.label ?? "").trim().slice(0, 96);

    if (isSupabaseConfigured()) {
      const supabase = createServiceClient();
      const { error } = await supabase.rpc("bump_event", { p_event: event, p_label: label });
      if (error) throw error;
    }
  } catch (err) {
    console.error("[event] beacon failed:", err);
  }
  return res;
}
