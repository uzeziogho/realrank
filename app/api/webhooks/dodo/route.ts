import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { activateSpotlight, getListingByHost, normalizeHost, refundSpotlightPayment } from "@/lib/listed";
import { SPOTLIGHT } from "@/lib/spotlight";
import { applySubscriptionEvent, type SubscriptionData } from "@/lib/placements";
import { alertOwner, sendSpotlightConfirmation } from "@/lib/placement-emails";
import { logWebhook } from "@/lib/admin-log";
import type { Json } from "@/lib/supabase/types";

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

/**
 * The parts of Dodo's payloads we use. Read tolerantly: a field we can't find
 * degrades to a safe default and an owner alert, never a dropped payment.
 */
interface DodoEvent {
  type?: string;
  data?: SubscriptionData & {
    payment_id?: string;
    refund_id?: string;
    refund?: { payment_id?: string } | null;
    metadata?: Record<string, unknown> | null;
  };
}

/** What the delivery log records about a request, filled in as it's handled. */
interface DeliveryContext {
  id: string | null;
  type: string | null;
  error: string | null;
  summary: Json | null;
}

/**
 * Every delivery — accepted, ignored or rejected — is written to the webhook
 * log (shown on /admin/placements), so "did Dodo's event arrive, and what
 * happened to it?" always has an answer.
 */
export async function POST(req: Request) {
  const ctx: DeliveryContext = { id: null, type: null, error: null, summary: null };
  const res = await handle(req, ctx);
  let outcome: string | null = null;
  try {
    const body = (await res.clone().json()) as Record<string, unknown>;
    outcome = String(body.outcome ?? body.error ?? (body.ignored ? "ignored" : body.needsManual ? "needs_manual" : body.ok ? "ok" : "failed"));
  } catch {
    /* non-JSON body */
  }
  await logWebhook({ deliveryId: ctx.id, type: ctx.type, status: res.status, outcome, error: ctx.error, summary: ctx.summary });
  return res;
}

async function handle(req: Request, ctx: DeliveryContext): Promise<NextResponse> {
  const secret = process.env.DODO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("[dodo] DODO_WEBHOOK_SECRET is not set — refusing webhook.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const id = req.headers.get("webhook-id");
  ctx.id = id;
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

  const type = event.type ?? "";
  const data = event.data ?? {};
  const meta = data.metadata ?? {};
  ctx.type = type || null;
  // Ids and field names only — enough to see a payload's shape, no emails.
  ctx.summary = {
    dataKeys: Object.keys(data),
    metadataKeys: Object.keys(meta),
    subscription_id: data.subscription_id ?? null,
    payment_id: data.payment_id ?? null,
    hasCustomerEmail: Boolean(data.customer?.email),
  };

  try {
    // ── Sponsor subscriptions: the whole lifecycle ─────────────────────────
    if (type.startsWith("subscription.")) {
      const outcome = await applySubscriptionEvent(type, data);
      if (outcome === "ignored" && !data.subscription_id) {
        // A payload shape we don't recognise — tell the owner what arrived.
        await alertOwner(
          `Webhook ${type} had no subscription id`,
          `Dodo sent ${type} but no data.subscription_id was found, so nothing changed.\nFields received: ${Object.keys(data).join(", ") || "none"}.\nSee the webhook log on /admin/placements.`,
        );
      }
      return NextResponse.json({ ok: true, outcome });
    }

    // ── Refunds: take back a Spotlight's paid days ─────────────────────────
    if (type === "refund.succeeded") {
      const paymentId = data.payment_id ?? data.refund?.payment_id;
      const result = paymentId ? await refundSpotlightPayment(paymentId) : { matched: false as const };
      if (!result.matched) {
        await alertOwner(
          "Refund needs a look",
          `A refund went through (payment ${paymentId ?? "unknown"}, refund ${data.refund_id ?? "unknown"}) that doesn't match a Spotlight payment.\nIf it was a sponsor, end or pause that slot at /admin/placements.`,
        );
      }
      return NextResponse.json({ ok: true, refund: result });
    }

    // ── Spotlight payments ─────────────────────────────────────────────────
    // Sponsor payments also arrive as payment.succeeded; the subscription
    // events above handle them, so only Spotlight payments act here.
    if (type !== "payment.succeeded" || meta.kind !== "spotlight") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const paymentId = data.payment_id ?? id;
    const host = typeof meta.host === "string" ? normalizeHost(meta.host) : null;
    const customerEmail = data.customer?.email ?? null;
    if (!host) {
      console.error("[dodo] spotlight payment without a valid host", paymentId);
      await alertOwner(
        "Spotlight payment needs manual activation",
        `A Spotlight payment (${paymentId}, ${customerEmail ?? "no email"}) arrived without a listing host in its metadata.\nStart it from /admin/placements, or: npm run spotlight:activate -- <host>`,
      );
      return NextResponse.json({ ok: true, needsManual: true });
    }

    const result = await activateSpotlight(host, paymentId, SPOTLIGHT.days, { customerEmail });
    if (!result.ok) {
      console.error("[dodo] spotlight activation failed", host, paymentId, result.error);
      ctx.error = result.error;
      if (result.permanent) {
        await alertOwner(
          "Spotlight payment couldn't be applied",
          `Payment ${paymentId} for ${host} (${customerEmail ?? "no email"}) could not be applied: ${result.error}\nFix it, or refund the buyer in Dodo.`,
        );
      }
      // Permanent problems are acknowledged (retrying can't help — the alert asks
      // for a manual fix or refund); transient ones get a 5xx so Dodo retries.
      return result.permanent
        ? NextResponse.json({ ok: false, needsManual: true })
        : NextResponse.json({ ok: false }, { status: 500 });
    }

    if (!result.alreadyApplied) {
      const listing = await getListingByHost(host);
      await sendSpotlightConfirmation(customerEmail, {
        name: listing?.displayName ?? host,
        host,
        start: result.start,
        until: result.until,
        queued: result.queued,
        // An existing run that started earlier was extended by this payment.
        extended: !result.queued && Date.parse(result.start) < Date.now() - 60_000,
      });
    }
    return NextResponse.json({
      ok: true,
      host,
      start: result.start,
      until: result.until,
      queued: result.queued,
      alreadyApplied: result.alreadyApplied,
    });
  } catch (err) {
    // Unexpected (database down, etc.): 5xx so Dodo retries the delivery.
    console.error("[dodo] webhook handling failed", type, err);
    ctx.error = err instanceof Error ? err.message : typeof err === "object" ? JSON.stringify(err) : String(err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
