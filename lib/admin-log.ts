import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { AdminNotification, Json, WebhookEvent } from "@/lib/supabase/types";

/**
 * The owner's operational record: admin notifications (the dashboard bell) and
 * the Dodo webhook delivery log. Every write here is best-effort — logging must
 * never be the reason a payment or a page fails — so errors are swallowed and
 * reads degrade to empty lists.
 */

// ── Notifications ─────────────────────────────────────────────────────────

export async function notifyAdmin(n: { kind?: "info" | "warning" | "money"; title: string; body?: string; link?: string }) {
  if (!isSupabaseConfigured()) return;
  try {
    await createServiceClient()
      .from("admin_notifications")
      .insert({ kind: n.kind ?? "info", title: n.title.slice(0, 200), body: n.body?.slice(0, 4000) ?? null, link: n.link ?? null });
  } catch (err) {
    console.error("[admin] notification insert failed:", err);
  }
}

export async function getNotifications(limit = 20): Promise<{ items: AdminNotification[]; unread: number; available: boolean }> {
  if (!isSupabaseConfigured()) return { items: [], unread: 0, available: false };
  try {
    const supabase = createServiceClient();
    const [{ data, error }, { count }] = await Promise.all([
      supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(limit),
      supabase.from("admin_notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);
    if (error) throw error;
    return { items: data ?? [], unread: count ?? 0, available: true };
  } catch {
    return { items: [], unread: 0, available: false };
  }
}

export async function markAllNotificationsRead() {
  if (!isSupabaseConfigured()) return;
  try {
    await createServiceClient().from("admin_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  } catch (err) {
    console.error("[admin] mark read failed:", err);
  }
}

// ── Webhook delivery log ──────────────────────────────────────────────────

export async function logWebhook(e: {
  deliveryId: string | null;
  type: string | null;
  status: number;
  outcome?: string | null;
  error?: string | null;
  summary?: Json;
}) {
  if (!isSupabaseConfigured()) return;
  try {
    await createServiceClient()
      .from("webhook_events")
      .insert({
        delivery_id: e.deliveryId,
        event_type: e.type,
        http_status: e.status,
        outcome: e.outcome ?? null,
        error: e.error?.slice(0, 1000) ?? null,
        summary: e.summary ?? null,
      });
  } catch (err) {
    console.error("[admin] webhook log insert failed:", err);
  }
}

export async function getRecentWebhookEvents(limit = 25): Promise<{ items: WebhookEvent[]; available: boolean }> {
  if (!isSupabaseConfigured()) return { items: [], available: false };
  try {
    const { data, error } = await createServiceClient()
      .from("webhook_events")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return { items: data ?? [], available: true };
  } catch {
    return { items: [], available: false };
  }
}

// ── Setup check ───────────────────────────────────────────────────────────

export interface SetupItem {
  label: string;
  ok: boolean;
  fix: string;
}

/**
 * Is everything paid placements depend on in place? Checks database tables
 * (by querying them) and which environment variables are SET — never their
 * values. Shown at the top of /admin/placements.
 */
export async function getSetupCheck(): Promise<SetupItem[]> {
  const env = (k: string) => Boolean(process.env[k]?.trim());
  const items: SetupItem[] = [];

  const tables: [string, string, string][] = [
    ["spotlight_payments", "payment_id", "20261115_paid_placements.sql"],
    ["sponsor_subscriptions", "subscription_id", "20261115_paid_placements.sql"],
    ["sponsored_slots", "status", "20261115_paid_placements.sql"],
    ["webhook_events", "id", "20261116_webhook_log_and_notifications.sql"],
    ["admin_notifications", "id", "20261116_webhook_log_and_notifications.sql"],
  ];
  if (isSupabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      const results = await Promise.all(
        tables.map(async ([t, col]) => {
          const { error } = await supabase.from(t as "webhook_events").select(col as "id").limit(1);
          return !error;
        }),
      );
      const byMigration = new Map<string, boolean>();
      tables.forEach(([, , mig], i) => byMigration.set(mig, (byMigration.get(mig) ?? true) && results[i]));
      for (const [mig, ok] of byMigration) {
        items.push({ label: `Database: migration ${mig}`, ok, fix: `Run supabase/migrations/${mig} in the Supabase SQL editor.` });
      }
    } catch {
      items.push({
        label: "Database reachable",
        ok: false,
        fix: "The server couldn't connect to Supabase — check SUPABASE_SERVICE_ROLE_KEY in Vercel.",
      });
    }
  }

  items.push(
    { label: "DODO_WEBHOOK_SECRET is set", ok: env("DODO_WEBHOOK_SECRET"), fix: "Copy the signing secret from Dodo → Developer → Webhooks → your endpoint." },
    { label: "SPOTLIGHT_CHECKOUT_URL is set", ok: /^https:\/\//.test(process.env.SPOTLIGHT_CHECKOUT_URL?.trim() ?? ""), fix: "Full https:// payment link of the Spotlight product." },
    { label: "SPONSOR_CHECKOUT_URL is set", ok: /^https:\/\//.test(process.env.SPONSOR_CHECKOUT_URL?.trim() ?? ""), fix: "Full https:// payment link of the $49/month Sponsor subscription." },
    { label: "OWNER_EMAIL is set (alerts + admin access)", ok: env("OWNER_EMAIL"), fix: "Set it to the Google account email you sign in with." },
    {
      label: "Email sending configured (RESEND_API_KEY + EMAIL_FROM)",
      ok: env("RESEND_API_KEY") && (env("EMAIL_FROM") || env("DIGEST_FROM")),
      fix: "Without these, alerts appear only on the dashboard bell and buyers get no emails.",
    },
  );
  return items;
}
