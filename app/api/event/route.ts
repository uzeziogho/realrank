import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same bot filter as the pulse beacon — keep product-analytics counts honest.
const BOT_RE =
  /bot|crawl|spider|slurp|bing|google|facebook|embedly|preview|monitor|curl|wget|headless|lighthouse|pingdom|uptime|screenshot|whatsapp|telegram|discord|slack/i;

/**
 * Named feature-usage events (Umami-style custom events). Fire-and-forget from
 * the client via `track()`. Stores aggregate counts only (no PII, no
 * per-visitor rows) in site_events. Always 204 so analytics can't break UX.
 */
export async function POST(req: Request) {
  const res = new NextResponse(null, { status: 204 });
  try {
    const h = await headers();
    if (BOT_RE.test(h.get("user-agent") ?? "")) return res;

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
