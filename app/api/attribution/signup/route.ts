import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signup beacon. The founder's site calls this when a visitor signs up (before
 * they pay), passing the rr_click id captured from the tracking-link redirect:
 *
 *   fetch("https://realrank.lol/api/attribution/signup", {
 *     method: "POST", body: JSON.stringify({ rr_click: rrClick })
 *   })
 *
 * Records a 'signup' conversion for the click's channel — one per click, so
 * repeated calls are idempotent. Public + CORS-enabled (it only accepts an
 * opaque click id, like an analytics beacon).
 */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503, headers: CORS });

  let rrClick: string | null = null;
  try {
    const body = (await req.json()) as { rr_click?: string };
    rrClick = body.rr_click?.trim() || null;
  } catch {
    // Also accept form-encoded / query param as a fallback for simple beacons.
    rrClick = req.nextUrl.searchParams.get("rr_click");
  }
  if (!rrClick) return NextResponse.json({ ok: true, note: "no click reference" }, { headers: CORS });

  const supabase = createServiceClient();
  const { data: click } = await supabase
    .from("channel_clicks")
    .select("id, channel_id")
    .eq("id", rrClick)
    .maybeSingle();
  if (!click) return NextResponse.json({ ok: true, note: "click not found" }, { headers: CORS });

  const { data: channel } = await supabase
    .from("channels")
    .select("id, user_id")
    .eq("id", click.channel_id)
    .maybeSingle();
  if (!channel) return NextResponse.json({ ok: true, note: "channel gone" }, { headers: CORS });

  const { error } = await supabase.from("channel_conversions").insert({
    channel_id: channel.id,
    click_id: click.id,
    user_id: channel.user_id,
    type: "signup",
    amount_cents: 0,
  });

  // Duplicate signup for this click (partial unique index) → already counted.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }

  return NextResponse.json({ ok: true }, { headers: CORS });
}
