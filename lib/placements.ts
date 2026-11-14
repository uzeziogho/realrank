import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LEADERBOARD_TAG, getHostClicksBetween } from "@/lib/data";
import { LISTED_TAG } from "@/lib/listed";
import { SPONSOR, cleanSponsorDetails } from "@/lib/sponsor";
import {
  alertOwner,
  sendSponsorConfirmation,
  sendSponsorEnding,
  sendSponsorPaymentFailed,
  sendSpotlightReminder,
  sendSpotlightResults,
} from "@/lib/placement-emails";
import type { SponsoredSlot, SponsorSubscription, SpotlightPayment } from "@/lib/supabase/types";

const DAY_MS = 86_400_000;
const iso = (t: number) => new Date(t).toISOString();

/** Re-render every surface a sponsor row appears on. */
function revalidateBoard() {
  revalidateTag(LEADERBOARD_TAG);
  revalidatePath("/");
  revalidatePath("/leaderboard");
}

// ───────────────────────────────────────────────────────────────────────────
// Sponsor slots
// ───────────────────────────────────────────────────────────────────────────

/** Statuses that hold a board position (a paused slot keeps its place). */
const HOLDS_POSITION = new Set(["active", "cancelled", "on_hold", "paused"]);

function holdsPosition(slot: SponsoredSlot, now = Date.now()): boolean {
  return HOLDS_POSITION.has(slot.status) && (!slot.ends_at || Date.parse(slot.ends_at) > now);
}

/** Board positions free for a new sponsor right now. */
export async function freeSponsorPositions(): Promise<number[]> {
  if (!isSupabaseConfigured()) return [...SPONSOR.positions];
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("sponsored_slots").select("*");
  if (error) throw error;
  const taken = new Set((data ?? []).filter((s) => holdsPosition(s)).map((s) => s.position_after_rank));
  return SPONSOR.positions.filter((p) => !taken.has(p));
}

/**
 * Tolerant view of a Dodo subscription payload. Field names follow Dodo's
 * subscription object; anything missing degrades to a safe default and every
 * unexpected shape is reported to the owner rather than silently dropped.
 */
export interface SubscriptionData {
  subscription_id?: string;
  status?: string;
  next_billing_date?: string | null;
  cancelled_at?: string | null;
  customer?: { email?: string | null; name?: string | null } | null;
  metadata?: Record<string, unknown> | null;
}

export type SubscriptionOutcome =
  | "created"
  | "renewed"
  | "needs_details"
  | "waitlist"
  | "on_hold"
  | "cancelled"
  | "ended"
  | "ignored";

/** Paid-through date from the payload, or a month from now if it's missing. */
function paidThroughOf(data: SubscriptionData): number {
  const t = data.next_billing_date ? Date.parse(data.next_billing_date) : NaN;
  if (Number.isFinite(t)) return t;
  console.warn("[placements] subscription without next_billing_date — assuming 31 days", data.subscription_id);
  return Date.now() + 31 * DAY_MS;
}

/**
 * Apply one subscription lifecycle event to its sponsor slot. Idempotent: a
 * redelivered event lands on the same row and only ever moves dates forward
 * (or, for a cancellation, to the paid-through date).
 *
 *   active / renewed / plan_changed → slot live until paid-through + grace
 *   on_hold / failed                → stays up through the grace, buyer emailed
 *   cancelled                       → stays up until paid-through, then ends
 *   expired                         → ends now
 */
export async function applySubscriptionEvent(type: string, data: SubscriptionData): Promise<SubscriptionOutcome> {
  const subId = data.subscription_id;
  if (!subId) return "ignored";
  const supabase = createServiceClient();
  const now = Date.now();
  const nowIso = iso(now);
  const email = data.customer?.email ?? null;

  const { data: bill, error: billErr } = await supabase
    .from("sponsor_subscriptions")
    .select("*")
    .eq("subscription_id", subId)
    .maybeSingle();
  if (billErr) throw billErr;
  const { data: slot } = bill?.slot_id
    ? await supabase.from("sponsored_slots").select("*").eq("id", bill.slot_id).maybeSingle()
    : { data: null as SponsoredSlot | null };

  const paid = ["subscription.active", "subscription.renewed", "subscription.plan_changed"].includes(type);

  // ── First payment: create the slot ────────────────────────────────────────
  if (paid && !bill) {
    const paidThrough = paidThroughOf(data);
    const details = cleanSponsorDetails({
      url: data.metadata?.url,
      name: data.metadata?.name,
      pitch: data.metadata?.pitch,
    });
    const free = details ? await freeSponsorPositions() : [];
    const status: SubscriptionOutcome = !details ? "needs_details" : free.length === 0 ? "waitlist" : "created";

    const { data: inserted, error: insErr } = await supabase
      .from("sponsored_slots")
      .insert({
        position_after_rank: free[0] ?? SPONSOR.positions[0],
        display_name: details?.name ?? "Sponsor (awaiting details)",
        site_url: details?.url ?? "",
        description: details?.pitch ?? null,
        cta_label: "Visit",
        is_active: status === "created",
        status: status === "created" ? "active" : status,
        starts_at: nowIso,
        ends_at: iso(paidThrough + SPONSOR.graceDays * DAY_MS),
        subscription_id: subId,
      })
      .select("id")
      .single();
    if (insErr) {
      // A concurrent delivery created it first — treat as a renewal of that row.
      if ((insErr as { code?: string }).code === "23505") return applySubscriptionEvent("subscription.renewed", data);
      throw insErr;
    }
    const { error: bErr } = await supabase.from("sponsor_subscriptions").insert({
      subscription_id: subId,
      slot_id: inserted.id,
      customer_email: email,
      status: "active",
      paid_through: iso(paidThrough),
      last_event: type,
      last_event_at: nowIso,
    });
    if (bErr && (bErr as { code?: string }).code !== "23505") throw bErr;

    if (status === "created") {
      await sendSponsorConfirmation(email, { name: details!.name, paidThrough: iso(paidThrough) });
      await alertOwner(
        `New sponsor live — ${details!.name}`,
        `${details!.name} (${details!.url}) is live after rank #${free[0]}, paid through ${iso(paidThrough).slice(0, 10)}.\nPitch: ${details!.pitch ?? "—"}\nCustomer: ${email ?? "unknown"}\n\nReview or pause it: /admin/placements`,
      );
      revalidateBoard();
    } else if (status === "needs_details") {
      await alertOwner(
        "Sponsor paid — details missing",
        `Subscription ${subId} (${email ?? "no email"}) was paid but arrived without the ad details (site, name, pitch).\nFill them in and switch it on at /admin/placements.`,
      );
    } else {
      await alertOwner(
        "Sponsor paid — no free position",
        `Subscription ${subId} (${email ?? "no email"}) for ${details!.name} was paid, but both sponsor positions are taken.\nIt's saved as "waitlist" at /admin/placements — start it when a slot frees up, or refund it in Dodo.`,
      );
    }
    return status;
  }

  if (!bill) {
    // A lifecycle event for a subscription we never saw paid (e.g. events
    // delivered out of order). Nothing to change; say so.
    console.warn("[placements] subscription event for unknown subscription", type, subId);
    return "ignored";
  }

  const patchBill: Partial<SponsorSubscription> = { last_event: type, last_event_at: nowIso };
  if (email && !bill.customer_email) patchBill.customer_email = email;
  const to = bill.customer_email ?? email;
  const name = slot?.display_name ?? "your site";
  let outcome: SubscriptionOutcome = "ignored";

  if (paid) {
    const paidThrough = Math.max(paidThroughOf(data), bill.paid_through ? Date.parse(bill.paid_through) : 0);
    patchBill.status = "active";
    patchBill.paid_through = iso(paidThrough);
    if (slot) {
      const reactivate = ["cancelled", "on_hold"].includes(slot.status);
      await supabase
        .from("sponsored_slots")
        .update({
          ends_at: iso(paidThrough + SPONSOR.graceDays * DAY_MS),
          ...(reactivate ? { status: "active" } : {}),
          updated_at: nowIso,
        })
        .eq("id", slot.id);
    }
    outcome = "renewed";
  } else if (type === "subscription.on_hold" || type === "subscription.failed") {
    patchBill.status = "on_hold";
    if (slot && slot.status === "active") {
      await supabase.from("sponsored_slots").update({ status: "on_hold", updated_at: nowIso }).eq("id", slot.id);
    }
    if (slot?.ends_at) await sendSponsorPaymentFailed(to, { name, until: slot.ends_at });
    outcome = "on_hold";
  } else if (type === "subscription.cancelled") {
    const paidThrough = Math.max(now, bill.paid_through ? Date.parse(bill.paid_through) : now);
    patchBill.status = "cancelled";
    patchBill.cancelled_at = data.cancelled_at ?? nowIso;
    if (slot && slot.status !== "ended") {
      await supabase
        .from("sponsored_slots")
        .update({ status: "cancelled", ends_at: iso(paidThrough), updated_at: nowIso })
        .eq("id", slot.id);
      await sendSponsorEnding(to, { name, until: iso(paidThrough) });
    }
    outcome = "cancelled";
  } else if (type === "subscription.expired") {
    patchBill.status = "ended";
    if (slot) {
      await supabase
        .from("sponsored_slots")
        .update({ status: "ended", ends_at: nowIso, updated_at: nowIso })
        .eq("id", slot.id);
    }
    outcome = "ended";
  }

  await supabase.from("sponsor_subscriptions").update(patchBill).eq("subscription_id", subId);
  if (outcome !== "ignored") revalidateBoard();
  return outcome;
}

// ───────────────────────────────────────────────────────────────────────────
// Daily Spotlight emails (reminder before the end, results after)
// ───────────────────────────────────────────────────────────────────────────

const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/** The buyer to write to for a host: the latest non-refunded payment's email. */
async function spotlightBuyer(supabase: ReturnType<typeof createServiceClient>, host: string): Promise<string | null> {
  const { data } = await supabase
    .from("spotlight_payments")
    .select("customer_email, refunded_at")
    .eq("host", host)
    .is("refunded_at", null)
    .order("created_at", { ascending: false })
    .limit(1);
  return data?.[0]?.customer_email ?? null;
}

export interface SpotlightEmailRun {
  reminders: string[];
  results: string[];
  skippedNoEmail: string[];
}

/**
 * Send each Spotlight run one reminder (~a day before it ends) and one results
 * summary (just after). Marked on the listing by the end date they were sent
 * for, so a run is never emailed twice and an extension gets its own pair.
 */
export async function sendDueSpotlightEmails(): Promise<SpotlightEmailRun> {
  const out: SpotlightEmailRun = { reminders: [], results: [], skippedNoEmail: [] };
  if (!isSupabaseConfigured()) return out;
  const supabase = createServiceClient();
  const now = Date.now();

  // Reminders: ending in the next 12–36 hours.
  const { data: ending } = await supabase
    .from("listed_sites")
    .select("host, display_name, spotlight_started_at, spotlight_until, spotlight_reminded_for")
    .eq("is_active", true)
    .gt("spotlight_until", iso(now + 12 * 3_600_000))
    .lte("spotlight_until", iso(now + 36 * 3_600_000));
  for (const l of ending ?? []) {
    if (l.spotlight_reminded_for === l.spotlight_until) continue;
    if (l.spotlight_started_at && Date.parse(l.spotlight_started_at) > now) continue; // not started yet
    const to = await spotlightBuyer(supabase, l.host);
    if (!to) {
      out.skippedNoEmail.push(l.host);
    } else {
      const start = l.spotlight_started_at ? Date.parse(l.spotlight_started_at) : now - 6 * DAY_MS;
      const visits = await getHostClicksBetween(l.host, isoDay(start), isoDay(now));
      await sendSpotlightReminder(to, { name: l.display_name, host: l.host, until: l.spotlight_until!, visits });
      out.reminders.push(l.host);
    }
    await supabase.from("listed_sites").update({ spotlight_reminded_for: l.spotlight_until }).eq("host", l.host);
  }

  // Results: ended in the last 3 days.
  const { data: ended } = await supabase
    .from("listed_sites")
    .select("host, display_name, spotlight_started_at, spotlight_until, spotlight_reported_for")
    .gt("spotlight_until", iso(now - 3 * DAY_MS))
    .lte("spotlight_until", iso(now));
  for (const l of ended ?? []) {
    if (l.spotlight_reported_for === l.spotlight_until || !l.spotlight_started_at) continue;
    const start = Date.parse(l.spotlight_started_at);
    const end = Date.parse(l.spotlight_until!);
    if (end - start < DAY_MS) continue; // ended almost at once (e.g. refunded) — nothing to report
    const to = await spotlightBuyer(supabase, l.host);
    if (!to) {
      out.skippedNoEmail.push(l.host);
    } else {
      const days = Math.max(1, Math.round((end - start) / DAY_MS));
      const [during, before] = await Promise.all([
        getHostClicksBetween(l.host, isoDay(start), isoDay(end)),
        getHostClicksBetween(l.host, isoDay(start - days * DAY_MS), isoDay(start - DAY_MS)),
      ]);
      await sendSpotlightResults(to, { name: l.display_name, host: l.host, days, during, before });
      out.results.push(l.host);
    }
    await supabase.from("listed_sites").update({ spotlight_reported_for: l.spotlight_until }).eq("host", l.host);
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Admin
// ───────────────────────────────────────────────────────────────────────────

export interface AdminSpotlight {
  host: string;
  name: string;
  start: string | null;
  until: string;
  payments: SpotlightPayment[];
}

export interface AdminSponsor {
  slot: SponsoredSlot;
  billing: SponsorSubscription | null;
}

/** Everything paid, recent first: Spotlights from the last 30 days and every sponsor slot. */
export async function getPlacementsOverview(): Promise<{ spotlights: AdminSpotlight[]; sponsors: AdminSponsor[] }> {
  if (!isSupabaseConfigured()) return { spotlights: [], sponsors: [] };
  const supabase = createServiceClient();
  const since = iso(Date.now() - 30 * DAY_MS);
  const [{ data: listings }, { data: payments }, { data: slots }, { data: bills }] = await Promise.all([
    supabase
      .from("listed_sites")
      .select("host, display_name, spotlight_started_at, spotlight_until")
      .gt("spotlight_until", since)
      .order("spotlight_until", { ascending: false }),
    supabase.from("spotlight_payments").select("*").gt("created_at", iso(Date.now() - 90 * DAY_MS)).order("created_at", { ascending: false }),
    supabase.from("sponsored_slots").select("*").order("created_at", { ascending: false }),
    supabase.from("sponsor_subscriptions").select("*"),
  ]);
  const spotlights = (listings ?? []).map((l) => ({
    host: l.host,
    name: l.display_name,
    start: l.spotlight_started_at,
    until: l.spotlight_until!,
    payments: (payments ?? []).filter((p) => p.host === l.host),
  }));
  const sponsors = (slots ?? []).map((slot) => ({
    slot,
    billing: (bills ?? []).find((b) => b.slot_id === slot.id || (slot.subscription_id && b.subscription_id === slot.subscription_id)) ?? null,
  }));
  return { spotlights, sponsors };
}

/** End a Spotlight now (or cancel a booking that hasn't started). */
export async function endSpotlightNow(host: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: row } = await supabase.from("listed_sites").select("spotlight_started_at").eq("host", host).maybeSingle();
  const now = Date.now();
  const notStarted = row?.spotlight_started_at && Date.parse(row.spotlight_started_at) > now;
  await supabase
    .from("listed_sites")
    .update(notStarted ? { spotlight_started_at: null, spotlight_until: null } : { spotlight_until: iso(now) })
    .eq("host", host);
  revalidateTag(LISTED_TAG);
}

export type SlotPatch = Partial<
  Pick<SponsoredSlot, "display_name" | "site_url" | "description" | "position_after_rank" | "ends_at" | "status" | "is_active">
>;

export async function updateSponsorSlot(id: string, patch: SlotPatch): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("sponsored_slots").update({ ...patch, updated_at: iso(Date.now()) }).eq("id", id);
  if (error) throw error;
  revalidateBoard();
}

export async function createManualSponsorSlot(fields: {
  display_name: string;
  site_url: string;
  description: string | null;
  position_after_rank: number;
  ends_at: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("sponsored_slots").insert({
    ...fields,
    cta_label: "Visit",
    is_active: true,
    status: "active",
    starts_at: iso(Date.now()),
  });
  if (error) throw error;
  revalidateBoard();
}
