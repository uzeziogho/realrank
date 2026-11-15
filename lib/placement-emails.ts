import "server-only";

import { sendEmail } from "@/lib/email";
import { siteConfig } from "@/lib/config";
import { SPOTLIGHT } from "@/lib/spotlight";
import { SPONSOR } from "@/lib/sponsor";
import { notifyAdmin } from "@/lib/admin-log";

/**
 * Emails to people who paid for visibility (Spotlight, Sponsor), plus alerts
 * to the site owner when a payment needs a human. Plain text on purpose: they
 * read as a note from a person, survive every client, and carry the facts —
 * dates, what happens next, how to get help. All sends are best-effort (see
 * lib/email.ts): a missing Resend config means silence, never a failed webhook.
 */

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

const signoff = `\n— ${siteConfig.name}\n${siteConfig.url}\nQuestions? Just reply, or write to ${siteConfig.email.support}.`;

async function send(to: string | null | undefined, subject: string, text: string) {
  if (!to) return { ok: false, error: "no recipient" };
  return sendEmail({ to, subject, text, replyTo: siteConfig.email.support });
}

/**
 * Alert the site owner about something that needs a person (or good news,
 * like a new sponsor). Always saved as a dashboard notification (the bell),
 * and emailed to OWNER_EMAIL when email is configured — so an alert is never
 * lost just because Resend isn't set up.
 */
export async function alertOwner(subject: string, text: string, kind: "info" | "warning" | "money" = "warning") {
  await notifyAdmin({ kind, title: subject, body: text, link: "/admin/placements" });
  const to = process.env.OWNER_EMAIL?.trim();
  if (!to) {
    console.warn("[placements] OWNER_EMAIL not set — alert emailed to nobody:", subject);
    return;
  }
  await sendEmail({ to, subject: `${siteConfig.name}: ${subject}`, text });
}

// ── Spotlight ───────────────────────────────────────────────────────────────

export function sendSpotlightConfirmation(
  to: string | null | undefined,
  p: { name: string; host: string; start: string; until: string; queued: boolean; extended: boolean },
) {
  const when = p.queued
    ? `All ${SPOTLIGHT.slots} Spotlight slots were taken, so your run is booked for the first free one:\n  Starts: ${day(p.start)}\n  Ends:   ${day(p.until)}`
    : p.extended
      ? `Your Spotlight has been extended. It now runs until ${day(p.until)}.`
      : `${p.name} is in the Spotlight now, until ${day(p.until)}.`;
  return send(
    to,
    p.queued ? `Your Spotlight for ${p.name} is booked` : `Your Spotlight for ${p.name} is live`,
    `Thanks for booking a Spotlight on ${siteConfig.name}.

${when}

Where it shows: the Spotlight lane at the top of the directory, ${p.name}'s category page and the homepage — labelled "Sponsored". It never changes anyone's rank.

See the visits it sends, as they come in:
${siteConfig.url}/listed/${p.host}/edit
${signoff}`,
  );
}

export function sendSpotlightReminder(to: string | null | undefined, p: { name: string; host: string; until: string; visits: number }) {
  return send(
    to,
    `Your Spotlight for ${p.name} ends ${day(p.until)}`,
    `A heads-up: ${p.name}'s Spotlight ends ${day(p.until)}.

So far it has sent ${p.visits} visit${p.visits === 1 ? "" : "s"} to ${p.host} (counted on clicks from ${siteConfig.name}, tagged ?ref=${new URL(siteConfig.url).hostname}).

Want to keep the spot? Another ${SPOTLIGHT.days} days is ${SPOTLIGHT.price} and starts the moment this run ends — no gap:
${siteConfig.url}/spotlight?host=${encodeURIComponent(p.host)}

No action needed if you're done; it simply ends.
${signoff}`,
  );
}

export function sendSpotlightResults(
  to: string | null | undefined,
  p: { name: string; host: string; days: number; during: number; before: number },
) {
  const change =
    p.before > 0
      ? `That's ${p.during >= p.before ? "up" : "down"} from ${p.before} in the ${p.days} days before it (${p.during >= p.before ? "+" : ""}${Math.round(((p.during - p.before) / p.before) * 100)}%).`
      : `There were no tracked visits from ${siteConfig.name} in the ${p.days} days before it.`;
  return send(
    to,
    `Your Spotlight results for ${p.name}`,
    `${p.name}'s Spotlight has ended. Here's what it did, honestly counted:

  Visits sent during the run (${p.days} days): ${p.during}
  ${change}

These are clicks from ${siteConfig.name} to ${p.host} — they're tagged ?ref=${new URL(siteConfig.url).hostname}, so you can see the same visits in your own analytics.

Run it again any time:
${siteConfig.url}/spotlight?host=${encodeURIComponent(p.host)}
${signoff}`,
  );
}

// ── Sponsor ─────────────────────────────────────────────────────────────────

export function sendSponsorConfirmation(to: string | null | undefined, p: { name: string; paidThrough: string }) {
  return send(
    to,
    `Your sponsor slot for ${p.name} is live`,
    `Thanks for sponsoring ${siteConfig.name}. ${p.name} is now in a labelled "Sponsored" row on the leaderboard.

It renews monthly (${SPONSOR.price}/${SPONSOR.cadence}) and stays up as long as the subscription is active. Paid through: ${day(p.paidThrough)}.

To change the text or link, just reply to this email. To stop, cancel the subscription from your Dodo Payments receipt — the slot stays up until the end of the period you've paid for.
${signoff}`,
  );
}

export function sendSponsorPaymentFailed(to: string | null | undefined, p: { name: string; until: string }) {
  return send(
    to,
    `Payment issue with your ${siteConfig.name} sponsor slot`,
    `The latest payment for ${p.name}'s sponsor slot didn't go through.

The slot stays up until ${day(p.until)} while it's retried. To keep it, update your payment method from your Dodo Payments receipt. If it isn't sorted by then, the slot comes down — nothing else changes.
${signoff}`,
  );
}

export function sendSponsorEnding(to: string | null | undefined, p: { name: string; until: string }) {
  return send(
    to,
    `Your ${siteConfig.name} sponsor slot ends ${day(p.until)}`,
    `Your sponsorship for ${p.name} has been cancelled. The slot stays up until the end of the period you've paid for: ${day(p.until)}. Thanks for supporting ${siteConfig.name}.

Want it back later? ${siteConfig.url}/sponsor
${signoff}`,
  );
}
