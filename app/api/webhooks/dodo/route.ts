import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { activateSpotlight, normalizeHost } from "@/lib/listed";
import { sendEmail } from "@/lib/email";
import { SPOTLIGHT } from "@/lib/spotlight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reject deliveries whose timestamp is further than this from now (replay guard). */
const TOLERANCE_SECONDS = 5 * 60;

/**
 * Dodo Payments webhook. Dodo signs deliveries per the Standard Webhooks spec:
 * HMAC-SHA256 over `${webhook-id}.${webhook-timestamp}.${rawBody}`, keyed with
 * the base64 secret after its `whsec_` prefix, sent in `webhook-signature` as
 * space-separated `v1,<base64>` entries. The raw body is verified before it is
 * parsed — re-serialising parsed JSON can change the bytes and break the check.
 */
function verifySignature(secret: string, id: string, timestamp: string, body: string, header: string): boolean {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64"));
  for (const part of header.split(" ")) {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) continue;
    const given = Buffer.from(sig);
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true;
  }
  return false;
}

interface DodoEvent {
  type?: string;
  data?: {
    payment_id?: string;
    metadata?: Record<string, unknown> | null;
  };
}

/** Tell the owner about a paid spotlight we couldn't apply, so they can fix or refund it. */
async function alertOwner(subject: string, text: string) {
  const to = process.env.OWNER_EMAIL?.trim();
  if (to) await sendEmail({ to, subject, text });
}

export async function POST(req: Request) {
  const secret = process.env.DODO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[dodo] DODO_WEBHOOK_SECRET is not set — refusing webhook.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const id = req.headers.get("webhook-id");
  const timestamp = req.headers.get("webhook-timestamp");
  const signature = req.headers.get("webhook-signature");
  const body = await req.text();

  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) {
    return NextResponse.json({ error: "Stale or invalid timestamp" }, { status: 401 });
  }
  if (!verifySignature(secret, id, timestamp, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: DodoEvent;
  try {
    event = JSON.parse(body) as DodoEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Only successful Spotlight payments do anything; everything else is
  // acknowledged so Dodo doesn't retry it.
  const meta = event.data?.metadata ?? {};
  if (event.type !== "payment.succeeded" || meta.kind !== "spotlight") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const paymentId = event.data?.payment_id ?? id;
  const host = typeof meta.host === "string" ? normalizeHost(meta.host) : null;
  if (!host) {
    console.error("[dodo] spotlight payment without a valid host", paymentId);
    await alertOwner(
      "RealRank: Spotlight payment needs manual activation",
      `A Spotlight payment (${paymentId}) arrived without a listing host in its metadata.\nActivate it by hand: npm run spotlight:activate -- <host>`,
    );
    return NextResponse.json({ ok: true, needsManual: true });
  }

  const result = await activateSpotlight(host, paymentId, SPOTLIGHT.days);
  if (!result.ok) {
    console.error("[dodo] spotlight activation failed", host, paymentId, result.error);
    if (result.permanent) await alertOwner(
      "RealRank: Spotlight payment couldn't be applied",
      `Payment ${paymentId} for ${host} could not be applied: ${result.error}\nFix it, or refund the buyer in Dodo.`,
    );
    // Permanent problems are acknowledged (retrying can't help — the alert asks
    // for a manual fix or refund); transient ones get a 5xx so Dodo retries.
    return result.permanent
      ? NextResponse.json({ ok: false, needsManual: true })
      : NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, host, until: result.until, alreadyApplied: result.alreadyApplied });
}
