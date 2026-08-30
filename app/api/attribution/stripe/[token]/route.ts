import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { decryptToken } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-user Stripe webhook for revenue attribution. The founder adds
 *   https://realrank.lol/api/attribution/stripe/<token>
 * to their Stripe dashboard and pastes the signing secret into RealRank (stored
 * encrypted). On a paid event we read the click id the founder forwarded via
 * client_reference_id / metadata.rr_click, map it to a channel, and record the
 * conversion. Signature is verified manually so we don't need the Stripe SDK.
 */
const TOLERANCE_SECONDS = 60 * 5;

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });

  const { token } = await ctx.params;
  const raw = await req.text();
  const sigHeader = req.headers.get("stripe-signature") ?? "";

  const supabase = createServiceClient();
  const { data: conn } = await supabase
    .from("stripe_connections")
    .select("user_id, encrypted_webhook_secret")
    .eq("webhook_token", token)
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: "unknown endpoint" }, { status: 404 });

  let secret: string;
  try {
    secret = decryptToken(conn.encrypted_webhook_secret);
  } catch {
    return NextResponse.json({ error: "bad secret" }, { status: 500 });
  }

  if (!verifyStripeSignature(raw, sigHeader, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(raw) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  // We only attribute completed purchases. Everything else is acknowledged.
  const obj = event.data?.object ?? {};
  const isPaid =
    (event.type === "checkout.session.completed" && obj.payment_status !== "unpaid") ||
    event.type === "invoice.paid" ||
    event.type === "invoice.payment_succeeded";
  if (!isPaid) return NextResponse.json({ ok: true, ignored: event.type });

  const clickId =
    obj.client_reference_id ??
    obj.metadata?.rr_click ??
    obj.subscription_details?.metadata?.rr_click ??
    null;
  if (!clickId) return NextResponse.json({ ok: true, note: "no click reference" });

  // Map click → channel, and confirm the channel belongs to this webhook's owner.
  const { data: click } = await supabase
    .from("channel_clicks")
    .select("id, channel_id")
    .eq("id", clickId)
    .maybeSingle();
  if (!click) return NextResponse.json({ ok: true, note: "click not found" });

  const { data: channel } = await supabase
    .from("channels")
    .select("id, user_id")
    .eq("id", click.channel_id)
    .maybeSingle();
  if (!channel || channel.user_id !== conn.user_id) {
    return NextResponse.json({ ok: true, note: "channel mismatch" });
  }

  const amount_cents = Number(obj.amount_total ?? obj.amount_paid ?? 0) || 0;
  const currency = String(obj.currency ?? "usd");

  const { error } = await supabase.from("channel_conversions").insert({
    channel_id: channel.id,
    click_id: click.id,
    user_id: conn.user_id,
    stripe_event_id: event.id,
    type: "customer",
    amount_cents,
    currency,
  });

  // Duplicate event id → already recorded; that's a success, not an error.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Verify Stripe's `t=…,v1=…` signature via HMAC-SHA256, timing-safe. */
function verifyStripeSignature(payload: string, header: string, secret: string): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    }),
  ) as { t?: string; v1?: string };

  if (!parts.t || !parts.v1) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(parts.t));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${payload}`, "utf8")
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

interface StripeEvent {
  id: string;
  type: string;
  data?: {
    object?: {
      client_reference_id?: string | null;
      payment_status?: string;
      amount_total?: number;
      amount_paid?: number;
      currency?: string;
      metadata?: { rr_click?: string } | null;
      subscription_details?: { metadata?: { rr_click?: string } | null } | null;
    };
  };
}
