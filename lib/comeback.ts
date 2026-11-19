import "server-only";

import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emailConfig, sendEmail } from "@/lib/email";
import { unsubUrl } from "@/lib/digest-email";
import { getActiveSites, getLeaderboardData, getOutboundClicks } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { SPOTLIGHT } from "@/lib/spotlight";
import { siteSlug } from "@/lib/site";
import { formatCompact, formatGrowth } from "@/lib/utils";

/**
 * Comeback emails — reasons to return after the first visit:
 *
 *  1. Owner weekly report (Mondays): each verified owner's rank, the change
 *     since last week's email, clicks, growth and who's next above them.
 *  2. Owner alerts (daily, after the refresh): "you're on the board" when a
 *     waiting site gets its first clicks, "you climbed to #4" when it beats
 *     the rank they were last told by 3+ places, and "you're #1". At most one
 *     per site every 3 days, none on Mondays (the weekly report covers it).
 *  3. Listing weekly report (Mondays): visits RealRank sent each directory
 *     listing, only in weeks with at least LISTING_VISITS_FLOOR of them.
 *
 * Off unless COMEBACK_EMAILS_ENABLED is "true" and email + CRON_SECRET (which
 * signs unsubscribe links) are configured. Every email carries a one-click
 * unsubscribe, and anyone in email_unsubscribes gets nothing. Plain text, like
 * every other RealRank email: it reads as a note, and can't render wrong.
 */

const DAY_MS = 86_400_000;
/** A rank jump this big (or bigger) earns an alert. */
const CLIMB_PLACES = 3;
/** Minimum gap between two alerts for the same site. */
const ALERT_COOLDOWN_DAYS = 3;
/** A listing report goes out only in weeks with at least this many visits. */
export const LISTING_VISITS_FLOOR = 5;

export type DraftKind = "owner_weekly" | "owner_alert" | "listing_weekly";

export interface Draft {
  kind: DraftKind;
  to: string;
  subject: string;
  text: string;
}

export interface ComebackReport {
  enabled: boolean;
  /** Why nothing was sent, if that's the case. */
  skipped: string | null;
  dryRun: boolean;
  weeklyRun: boolean;
  sent: Record<DraftKind, number>;
  failed: number;
  /** Sites seen for the first time: baseline recorded, nothing sent. */
  baselined: number;
  drafts: Draft[];
}

export function comebackStatus(): { enabled: boolean; reason: string | null } {
  if (process.env.COMEBACK_EMAILS_ENABLED?.trim() !== "true") return { enabled: false, reason: "COMEBACK_EMAILS_ENABLED isn't \"true\"" };
  if (!emailConfig()) return { enabled: false, reason: "email isn't configured (RESEND_API_KEY + EMAIL_FROM)" };
  if (!process.env.CRON_SECRET?.trim()) return { enabled: false, reason: "CRON_SECRET isn't set, so unsubscribe links can't be signed" };
  return { enabled: true, reason: null };
}

/** "2026-W47" — the ISO week, used to send each weekly report once. */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// ── Composition (pure) ─────────────────────────────────────────────────────

export interface OwnerSiteLine {
  siteId: string;
  name: string;
  host: string;
  /** Null when the site has no clicks yet (pending). */
  rank: number | null;
  total: number;
  /** Rank shown in last week's email, if any. */
  prevRank: number | null;
  clicks7d: number;
  growth: number;
  nextUp: { name: string; rank: number } | null;
  listed: boolean;
  spotlightUntil: string | null;
}

const url = (path: string) => `${siteConfig.url}${path}`;
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function change(rank: number, prev: number | null): string {
  if (prev === null) return "";
  if (prev > rank) return ` — up ${prev - rank} since last week`;
  if (prev < rank) return ` — down ${rank - prev} since last week`;
  return " — same as last week";
}

/** One next step, chosen for where the site is: directory first, then Spotlight. */
function nudge(s: OwnerSiteLine): string {
  if (!s.listed) {
    return `Next step: add ${s.name} to the directory — free, and verified already, so it gets a followed link:\n${url("/dashboard#directory")}`;
  }
  if (!s.spotlightUntil || Date.parse(s.spotlightUntil) < Date.now()) {
    return `Want more visitors this week? A Spotlight puts ${s.name} at the top of the directory for ${SPOTLIGHT.days} days (${SPOTLIGHT.price}):\n${url(`/spotlight?host=${encodeURIComponent(s.host)}`)}`;
  }
  return `${s.name}'s Spotlight is live until ${day(s.spotlightUntil)}.`;
}

function footer(reason: string, unsub: string): string {
  return `\n—\n${reason}\nUnsubscribe: ${unsub}`;
}

export function composeOwnerWeekly(lines: OwnerSiteLine[], unsub: string): { subject: string; text: string } {
  const ranked = lines.filter((l) => l.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const waiting = lines.filter((l) => l.rank === null);
  const lead = ranked[0];
  const moved = lead.prevRank !== null && lead.prevRank !== lead.rank! ? ` (${lead.prevRank > lead.rank! ? "up" : "down"} ${Math.abs(lead.prevRank - lead.rank!)})` : "";
  const subject = `Your ${siteConfig.name} week: ${lead.name} is #${lead.rank}${moved}`;

  const blocks = ranked.map((s) =>
    [
      `${s.name} (${s.host})`,
      `  #${s.rank} of ${s.total} on the momentum board${change(s.rank!, s.prevRank)}`,
      `  ${formatCompact(s.clicks7d)} organic clicks in the last 7 days · ${formatGrowth(s.growth)} momentum`,
      s.nextUp ? `  Next up: ${s.nextUp.name} at #${s.nextUp.rank}` : `  You're #1 — ${s.total - 1} verified sites behind you.`,
      `  Profile: ${url(`/site/${siteSlug(`https://${s.host}`)}`)}`,
    ].join("\n"),
  );
  for (const s of waiting) {
    blocks.push(`${s.name} (${s.host})\n  No organic clicks in the last 28 days yet — it joins the board automatically the day they land.`);
  }

  const text = [
    `Here's how you did on ${siteConfig.name} this week.`,
    "",
    blocks.join("\n\n"),
    "",
    nudge(lead),
    "",
    `The full board: ${url("/leaderboard")}`,
    footer(`You're getting this because you connected Search Console to ${siteConfig.name}: one email a week, plus a note when your rank jumps.`, unsub),
  ].join("\n");
  return { subject, text };
}

export type AlertReason = "on_board" | "climb" | "top";

export function composeOwnerAlert(reason: AlertReason, s: OwnerSiteLine, from: number | null, unsub: string): { subject: string; text: string } {
  const profile = url(`/site/${siteSlug(`https://${s.host}`)}`);
  const shareLine = `Share it: ${profile}`;
  let subject: string;
  let lead: string;
  if (reason === "on_board") {
    subject = `${s.name} is on the ${siteConfig.name} board — #${s.rank}`;
    lead = `${s.name}'s first organic clicks have landed, so it's now ranked: #${s.rank} of ${s.total} on the momentum board, with ${formatCompact(s.clicks7d)} clicks in the last 7 days.`;
  } else if (reason === "top") {
    subject = `${s.name} is #1 on ${siteConfig.name}`;
    lead = `${s.name} just reached #1 of ${s.total} on the momentum board${from ? `, up from #${from}` : ""}: the fastest-growing verified site right now (${formatGrowth(s.growth)} momentum).`;
  } else {
    subject = `${s.name} climbed to #${s.rank} on ${siteConfig.name}`;
    lead = `${s.name} moved up ${from! - s.rank!} places, from #${from} to #${s.rank} of ${s.total} on the momentum board (${formatGrowth(s.growth)} momentum, ${formatCompact(s.clicks7d)} clicks in 7 days).`;
  }
  const text = [
    lead,
    "",
    s.nextUp ? `Next up: ${s.nextUp.name} at #${s.nextUp.rank}.` : "Nobody's ahead of you. The board refreshes daily — keep it up.",
    shareLine,
    "",
    nudge(s),
    footer(`You're getting this because you connected Search Console to ${siteConfig.name}. Rank alerts come at most every ${ALERT_COOLDOWN_DAYS} days.`, unsub),
  ].join("\n");
  return { subject, text };
}

export interface ListingLine {
  host: string;
  name: string;
  week: number;
  total: number;
  verified: boolean;
  spotlightUntil: string | null;
}

export function composeListingWeekly(items: ListingLine[], unsub: string): { subject: string; text: string } {
  const week = items.reduce((n, i) => n + i.week, 0);
  const subject =
    items.length === 1
      ? `${items[0].name} got ${week} visit${week === 1 ? "" : "s"} from ${siteConfig.name} this week`
      : `Your listings got ${week} visits from ${siteConfig.name} this week`;
  const blocks = items.map((i) => {
    const next = !i.verified
      ? `  Verify you own it for a followed link and Spotlight access: ${url(`/listed/${i.host}/edit`)}`
      : i.spotlightUntil && Date.parse(i.spotlightUntil) > Date.now()
        ? `  Spotlight live until ${day(i.spotlightUntil)}.`
        : `  Want more? A Spotlight puts it at the top of the directory for ${SPOTLIGHT.days} days (${SPOTLIGHT.price}): ${url(`/spotlight?host=${encodeURIComponent(i.host)}`)}`;
    return [`${i.name} (${i.host})`, `  ${i.week} visit${i.week === 1 ? "" : "s"} this week · ${formatCompact(i.total)} since it was listed`, next].join("\n");
  });
  const text = [
    `Visits ${siteConfig.name} sent your ${items.length === 1 ? "listing" : "listings"} in the last 7 days:`,
    "",
    blocks.join("\n\n"),
    "",
    `These are real clicks from ${siteConfig.name}, tagged ?ref=${new URL(siteConfig.url).hostname}, so you can find them in your own analytics.`,
    "",
    `Want a verified, ranked spot on the leaderboard too? Connect Search Console (read-only, free): ${url("/login")}`,
    footer(`You're getting this because you listed a project on ${siteConfig.name}. It only arrives in weeks your listing gets visits.`, unsub),
  ].join("\n");
  return { subject, text };
}

// ── Running ────────────────────────────────────────────────────────────────

/**
 * Work out every email due now and send it (or, with dryRun, return the drafts
 * without sending or recording anything). forceWeekly runs the Monday reports
 * on any day — for previews. Never throws on a single bad send.
 */
export async function runComeback(opts: { dryRun?: boolean; forceWeekly?: boolean; now?: Date } = {}): Promise<ComebackReport> {
  try {
    return await run(opts);
  } catch (err) {
    console.error("[comeback] run failed:", err);
    const status = comebackStatus();
    return {
      enabled: status.enabled,
      skipped: `couldn't read the data: ${err instanceof Error ? err.message : String(err)}`,
      dryRun: opts.dryRun ?? false,
      weeklyRun: false,
      sent: { owner_weekly: 0, owner_alert: 0, listing_weekly: 0 },
      failed: 0,
      baselined: 0,
      drafts: [],
    };
  }
}

async function run(opts: { dryRun?: boolean; forceWeekly?: boolean; now?: Date }): Promise<ComebackReport> {
  const dryRun = opts.dryRun ?? false;
  const now = opts.now ?? new Date();
  const weeklyRun = opts.forceWeekly || now.getUTCDay() === 1;
  const status = comebackStatus();
  const report: ComebackReport = {
    enabled: status.enabled,
    skipped: null,
    dryRun,
    weeklyRun,
    sent: { owner_weekly: 0, owner_alert: 0, listing_weekly: 0 },
    failed: 0,
    baselined: 0,
    drafts: [],
  };
  if (!dryRun && !status.enabled) return { ...report, skipped: status.reason };
  if (!isSupabaseConfigured()) return { ...report, skipped: "Supabase isn't configured" };

  const supabase = createServiceClient();
  const week = isoWeek(now);
  const today = now.toISOString().slice(0, 10);

  // ── Load everything once ────────────────────────────────────────────────
  const [{ sites }, board, statesRes, unsubRes, listedRes, visitsWeek, visitsAll] = await Promise.all([
    getActiveSites(),
    getLeaderboardData("momentum"),
    supabase.from("owner_email_state").select("*"),
    supabase.from("email_unsubscribes").select("email"),
    supabase.from("listed_sites").select("host, display_name, submitter_email, owner_verified, spotlight_until").eq("is_active", true),
    getOutboundClicks(7),
    getOutboundClicks(),
  ]);
  if (statesRes.error) return { ...report, skipped: `owner_email_state unreadable — run supabase/migrations/20261120_comeback_emails.sql (${statesRes.error.message})` };

  const states = new Map((statesRes.data ?? []).map((s) => [s.site_id, s]));
  const unsubscribed = new Set((unsubRes.data ?? []).map((r) => r.email.trim().toLowerCase()));
  const listings = listedRes.data ?? [];
  const listingByHost = new Map(listings.map((l) => [l.host, l]));

  const ranked = board.organic.filter((r) => !r.pending);
  const total = ranked.length;
  const rowById = new Map(board.organic.map((r) => [r.id, r]));
  const byRank = new Map(ranked.map((r) => [r.rank, r]));

  const userIds = [...new Set(sites.map((s) => s.user_id))];
  const emailByUser = new Map<string, string>();
  if (userIds.length) {
    const { data } = await supabase.from("profiles").select("id, email").in("id", userIds);
    for (const p of data ?? []) if (p.email) emailByUser.set(p.id, p.email.trim().toLowerCase());
  }

  const lineFor = (siteId: string): OwnerSiteLine | null => {
    const s = sites.find((x) => x.id === siteId);
    const row = rowById.get(siteId);
    if (!s || !row) return null;
    const host = siteSlug(s.site_url);
    const rank = row.pending ? null : row.rank;
    const above = rank && rank > 1 ? byRank.get(rank - 1) : null;
    const listing = listingByHost.get(host) ?? listingByHost.get(host.replace(/^www\./, ""));
    return {
      siteId,
      name: s.display_name,
      host,
      rank,
      total,
      prevRank: states.get(siteId)?.weekly_rank ?? null,
      clicks7d: row.clicks7d,
      growth: row.growthRate,
      nextUp: above ? { name: above.displayName, rank: above.rank } : null,
      listed: Boolean(listing),
      spotlightUntil: listing?.spotlight_until ?? null,
    };
  };

  // Send once: claim the log row first (unique per kind/subject/period), send,
  // and release the claim if the send fails so a retry can try again.
  async function deliver(kind: DraftKind, to: string, subjectKey: string, period: string, mail: { subject: string; text: string }, unsub: string) {
    report.drafts.push({ kind, to, ...mail });
    if (dryRun) return true;
    const claim = await supabase.from("email_log").insert({ kind, recipient: to, subject_key: subjectKey, period });
    if (claim.error) return claim.error.code === "23505" ? false : (report.failed++, false);
    const res = await sendEmail({
      to,
      subject: mail.subject,
      text: mail.text,
      replyTo: siteConfig.email.support,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (!res.ok) {
      await supabase.from("email_log").delete().eq("kind", kind).eq("subject_key", subjectKey).eq("period", period);
      report.failed++;
      return false;
    }
    report.sent[kind]++;
    return true;
  }

  // Previews still need a link in the footer, even where CRON_SECRET is unset.
  const unsubFor = (to: string) => unsubUrl(to) ?? (dryRun ? url("/api/unsubscribe?e=preview") : null);

  const saveState = async (siteId: string, patch: Record<string, unknown>) => {
    if (dryRun) return;
    await supabase.from("owner_email_state").upsert({ site_id: siteId, ...patch, updated_at: now.toISOString() }, { onConflict: "site_id" });
  };

  // ── 1. Owner weekly report ──────────────────────────────────────────────
  const weeklyUsers = new Set<string>();
  const weeklyEmails = new Set<string>();
  if (weeklyRun) {
    for (const userId of userIds) {
      const to = emailByUser.get(userId);
      if (!to || unsubscribed.has(to)) continue;
      const lines = sites.filter((s) => s.user_id === userId).map((s) => lineFor(s.id)).filter(Boolean) as OwnerSiteLine[];
      if (!lines.some((l) => l.rank !== null)) continue; // nothing to report yet; the on-board alert covers it
      const unsub = unsubFor(to);
      if (!unsub) continue;
      const ok = await deliver("owner_weekly", to, userId, week, composeOwnerWeekly(lines, unsub), unsub);
      weeklyUsers.add(userId);
      weeklyEmails.add(to);
      if (ok) {
        // The weekly report becomes the new baseline for both the weekly
        // change and the alert threshold, so no alert repeats it tomorrow.
        for (const l of lines) await saveState(l.siteId, { weekly_rank: l.rank, weekly_at: now.toISOString(), alert_rank: l.rank });
      }
    }
  }

  // ── 2. Owner alerts ─────────────────────────────────────────────────────
  for (const s of sites) {
    const line = lineFor(s.id);
    if (!line) continue;
    const st = states.get(s.id);
    if (!st) {
      // First sighting: remember where it stands, send nothing.
      report.baselined++;
      await saveState(s.id, { alert_rank: line.rank });
      continue;
    }
    if (weeklyUsers.has(s.user_id)) continue;

    const from = st.alert_rank;
    let reason: AlertReason | null = null;
    if (from === null && line.rank !== null) reason = "on_board";
    else if (from !== null && line.rank !== null) {
      // Measured against the best rank they were last told (an alert or the
      // weekly report), so slipping and bouncing back never reads as a climb,
      // and a site that drops off and returns doesn't get "on the board" twice.
      if (line.rank === 1 && from !== 1) reason = "top";
      else if (from - line.rank >= CLIMB_PLACES) reason = "climb";
    }
    if (!reason) continue;

    const cooling = st.alerted_at && now.getTime() - Date.parse(st.alerted_at) < ALERT_COOLDOWN_DAYS * DAY_MS;
    if (cooling && reason !== "on_board") continue;
    const to = emailByUser.get(s.user_id);
    if (!to || unsubscribed.has(to)) {
      await saveState(s.id, { alert_rank: line.rank });
      continue;
    }
    const unsub = unsubFor(to);
    if (!unsub) continue;
    const ok = await deliver("owner_alert", to, s.id, `${today}:${reason}`, composeOwnerAlert(reason, line, from, unsub), unsub);
    if (ok) await saveState(s.id, { alert_rank: line.rank, alerted_at: now.toISOString() });
  }

  // ── 3. Listing weekly report ────────────────────────────────────────────
  if (weeklyRun) {
    const byEmail = new Map<string, ListingLine[]>();
    for (const l of listings) {
      const to = l.submitter_email?.trim().toLowerCase();
      const week7 = visitsWeek.get(l.host) ?? 0;
      if (!to || unsubscribed.has(to) || weeklyEmails.has(to) || week7 < LISTING_VISITS_FLOOR) continue;
      const items = byEmail.get(to) ?? [];
      items.push({
        host: l.host,
        name: l.display_name,
        week: week7,
        total: visitsAll.get(l.host) ?? week7,
        verified: l.owner_verified,
        spotlightUntil: l.spotlight_until ?? null,
      });
      byEmail.set(to, items);
    }
    for (const [to, items] of byEmail) {
      const unsub = unsubFor(to);
      if (!unsub) continue;
      items.sort((a, b) => b.week - a.week);
      await deliver("listing_weekly", to, to, week, composeListingWeekly(items, unsub), unsub);
    }
  }

  return report;
}
