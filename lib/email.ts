import "server-only";

import { siteConfig } from "@/lib/config";

/**
 * Shared transactional email transport (Resend HTTP API).
 *
 * Deliberately a thin wrapper over `fetch` rather than the Resend SDK: it adds
 * no dependency, runs anywhere (edge or node), and keeps the one well-behaved
 * sender that every touchpoint — the weekly digest, submit confirmations,
 * anything later — routes through. Nothing here ever throws: mail is best-effort
 * on top of the real work, so a caller gets `{ ok: false, error }` and carries on.
 */

export interface EmailConfig {
  apiKey: string;
  from: string;
}

/**
 * Resolve the default transactional config, or null when it isn't set up yet.
 * EMAIL_FROM is the shared sender; it falls back to DIGEST_FROM so a single
 * verified address configured for the digest also powers transactional mail.
 * Both the key and a From on a Resend-verified domain are required — without a
 * verified sender every send bounces, so "not configured" must mean silence.
 */
export function emailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || process.env.DIGEST_FROM?.trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  /** Override the default From (e.g. the digest's own verified sender). */
  from?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /** Override the resolved API key (e.g. a caller that gates on its own flags). */
  apiKey?: string;
}

export interface SendEmailResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Send one email through Resend. Never throws. A missing config is a soft
 * `{ ok: false }` with a reason, not an exception, so a half-configured
 * environment sends nothing instead of crashing a request.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = emailConfig();
  const apiKey = input.apiKey ?? config?.apiKey;
  const from = input.from ?? config?.from;
  if (!apiKey || !from) {
    return { ok: false, error: "email not configured (RESEND_API_KEY / EMAIL_FROM)" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        ...(input.html ? { html: input.html } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.headers ? { headers: input.headers } : {}),
      }),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text().catch(() => "");
    console.error("[email] send failed:", res.status, body);
    return { ok: false, status: res.status, error: `resend ${res.status}` };
  } catch (err) {
    console.error("[email] send threw:", err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Compose the "your project is listed" confirmation — a transactional reply to
 * the submitter's own action, so it needs no consent and no unsubscribe. It
 * points at the three next steps: the permanent link, claiming the checkmark,
 * and connecting Search Console to get ranked.
 */
export function listingConfirmationEmail(opts: { displayName: string; host: string }): {
  subject: string;
  text: string;
  html: string;
} {
  const { displayName, host } = opts;
  const base = siteConfig.url;
  const listingUrl = `${base}/listed/${host}`;
  const claimUrl = `${base}/listed/${host}/edit`;

  const subject = `${displayName} is listed on ${siteConfig.name}`;

  const text = [
    `${displayName} is now listed on ${siteConfig.name}.`,
    "",
    `Your permanent link: ${listingUrl}`,
    "",
    `Claim the verified checkmark (prove you own the site) and earn a followed link back:`,
    claimUrl,
    "",
    `Connect Google Search Console — free — to get a verified, ranked spot on the momentum board:`,
    `${base}/pricing`,
    "",
    "—",
    `${siteConfig.name}`,
    base,
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f6f7f9;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e6e8eb;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0;font-size:13px;color:#6b7280;letter-spacing:.02em;">${escapeHtml(siteConfig.name)}</p>
          <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;color:#111827;">${escapeHtml(displayName)} is listed</h1>
        </td></tr>
        <tr><td style="padding:8px 28px 0;">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151;">Your project is now on the ${escapeHtml(siteConfig.name)} directory. Here's your permanent link:</p>
          <p style="margin:0 0 20px;"><a href="${listingUrl}" style="font-size:15px;color:#2563eb;text-decoration:none;word-break:break-all;">${listingUrl}</a></p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="border-radius:8px;background:#111827;">
            <a href="${claimUrl}" style="display:inline-block;padding:11px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Claim the verified checkmark &rarr;</a>
          </td></tr></table>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.55;color:#6b7280;">Proving you own the site earns a <strong style="color:#374151;">followed link</strong> back to you. Want a ranked spot too? Connect Google Search Console — it's free — and verified momentum ranks you on the board.</p>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;border-top:1px solid #f0f1f3;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">You're getting this because ${escapeHtml(displayName)} was just submitted to <a href="${base}" style="color:#9ca3af;">${escapeHtml(siteConfig.name)}</a>. If that wasn't you, you can ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
