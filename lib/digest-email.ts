import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/config";
import type { MoversDigest } from "@/lib/digest";

/**
 * Emailing the weekly Movers digest.
 *
 * Deliberately off unless three things are true: DIGEST_EMAIL_ENABLED is
 * "true", RESEND_API_KEY is set, and DIGEST_FROM is a verified sender. Mail is
 * the one thing here that can't be taken back once sent, so the default has to
 * be silence rather than a half-configured send to real people.
 *
 * Who gets it:
 *  - waitlist rows — these people typed their address into a form that said
 *    "we'll be in touch", which is consent.
 *  - listing submitter emails — ONLY when DIGEST_INCLUDE_LISTINGS is "true".
 *    Those addresses arrived with a listing, as a contact for that listing, not
 *    as a newsletter sign-up. Treating them as subscribers is a decision with
 *    legal weight, so it needs its own switch and a privacy policy that says so.
 *
 * Everyone can get out: every send carries an unsubscribe link and a
 * List-Unsubscribe header, and the address is checked against
 * email_unsubscribes first.
 */

/** A digest send is only attempted when all of this is configured. */
export interface DigestMailConfig {
  apiKey: string;
  from: string;
  includeListings: boolean;
}

export function digestMailConfig(): DigestMailConfig | null {
  if (process.env.DIGEST_EMAIL_ENABLED?.trim() !== "true") return null;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.DIGEST_FROM?.trim();
  if (!apiKey || !from) return null;
  return {
    apiKey,
    from,
    includeListings: process.env.DIGEST_INCLUDE_LISTINGS?.trim() === "true",
  };
}

/**
 * Unsubscribe links carry an HMAC of the address, so a link can't be forged to
 * opt someone else out and no per-address token has to be stored. Keyed on
 * CRON_SECRET, which already exists and is already server-only.
 */
function unsubSecret(): string | null {
  return process.env.CRON_SECRET?.trim() || null;
}

export function unsubToken(email: string): string | null {
  const secret = unsubSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(email.toLowerCase()).digest("hex").slice(0, 32);
}

export function unsubTokenValid(email: string, token: string): boolean {
  const expected = unsubToken(email);
  if (!expected || !token || expected.length !== token.length) return false;
  // Constant-time compare so a wrong token can't be narrowed down by timing.
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function unsubUrl(email: string): string | null {
  const token = unsubToken(email);
  if (!token) return null;
  const u = new URL("/api/unsubscribe", siteConfig.url);
  u.searchParams.set("e", email);
  u.searchParams.set("t", token);
  return u.toString();
}

/** Record an opt-out. Idempotent — a second click is still a success. */
export async function unsubscribe(email: string, source = "digest"): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = createServiceClient();
    const { error } = await supabase
      .from("email_unsubscribes")
      .insert({ email: email.toLowerCase(), source });
    if (error && error.code !== "23505") throw error;
    return true;
  } catch (err) {
    console.error("[digest] unsubscribe failed:", err);
    return false;
  }
}

/**
 * The addresses a digest would go to: deduped, lowercased, minus anyone who
 * opted out. Returns an empty list rather than throwing, so a read failure
 * sends nothing instead of sending to a partial list.
 */
export async function digestRecipients(includeListings: boolean): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createServiceClient();

    const { data: waiting, error: wErr } = await supabase.from("waitlist").select("email");
    if (wErr) throw wErr;

    const emails = new Set<string>();
    for (const r of waiting ?? []) {
      const e = (r.email ?? "").trim().toLowerCase();
      if (e) emails.add(e);
    }

    if (includeListings) {
      const { data: listed, error: lErr } = await supabase
        .from("listed_sites")
        .select("submitter_email")
        .eq("is_active", true)
        .not("submitter_email", "is", null);
      if (lErr) throw lErr;
      for (const r of listed ?? []) {
        const e = (r.submitter_email ?? "").trim().toLowerCase();
        if (e) emails.add(e);
      }
    }

    if (emails.size === 0) return [];

    const { data: out, error: oErr } = await supabase
      .from("email_unsubscribes")
      .select("email");
    if (oErr) throw oErr;
    for (const r of out ?? []) emails.delete((r.email ?? "").trim().toLowerCase());

    return [...emails];
  } catch (err) {
    console.error("[digest] recipient read failed:", err);
    return [];
  }
}

export interface DigestSendResult {
  attempted: number;
  sent: number;
  failed: number;
  /** Why nothing was attempted, when that's the case. */
  skipped: string | null;
}

/**
 * Send one digest to every recipient, one request each so a single bad address
 * can't take out the batch, and with its own unsubscribe link per address.
 * Never throws: the cron's job is to post the digest, and mail is a bonus on
 * top of that.
 */
export async function sendDigestEmails(digest: MoversDigest): Promise<DigestSendResult> {
  const none = (skipped: string): DigestSendResult => ({ attempted: 0, sent: 0, failed: 0, skipped });

  if (digest.empty) return none("quiet week — nothing to send");
  const config = digestMailConfig();
  if (!config) return none("email not configured (DIGEST_EMAIL_ENABLED / RESEND_API_KEY / DIGEST_FROM)");
  if (!unsubSecret()) return none("no CRON_SECRET, so unsubscribe links can't be signed");

  const recipients = await digestRecipients(config.includeListings);
  if (recipients.length === 0) return none("no recipients");

  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    const unsub = unsubUrl(to);
    if (!unsub) {
      failed += 1;
      continue;
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to,
          subject: digestSubject(digest),
          text: digestText(digest, unsub),
          // One-click unsubscribe, so a reader never has to hunt for it and
          // mail clients can offer it themselves.
          headers: {
            "List-Unsubscribe": `<${unsub}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });
      if (res.ok) sent += 1;
      else {
        failed += 1;
        console.error("[digest] send failed:", res.status, await res.text().catch(() => ""));
      }
    } catch (err) {
      failed += 1;
      console.error("[digest] send threw:", err);
    }
  }

  return { attempted: recipients.length, sent, failed, skipped: null };
}

function digestSubject(digest: MoversDigest): string {
  const top = digest.climbers[0];
  if (top) return `${siteConfig.name}: ${top.name} is this week's biggest climber`;
  return `${siteConfig.name}: this week's movers`;
}

/** Plain text — the digest is a few lines, and text can't render wrong. */
function digestText(digest: MoversDigest, unsub: string): string {
  return [
    digest.text,
    "",
    `See the full board: ${digest.url}`,
    "",
    "—",
    `You're receiving this because you joined the ${siteConfig.name} list or listed a project.`,
    `Unsubscribe: ${unsub}`,
  ].join("\n");
}
