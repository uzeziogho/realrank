import { NextRequest, NextResponse } from "next/server";
import { buildMoversDigest } from "@/lib/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Weekly Movers auto-post (Vercel Cron, Mondays).
 *
 * Composes the week's verified climbers/newcomers into a post-ready digest and,
 * when WEEKLY_DIGEST_WEBHOOK_URL is set, POSTs it there — point that at a
 * Zapier/Make/Buffer/Slack inbound webhook to fan it out to X, LinkedIn, etc.
 * The webhook is optional: with none set the route just returns the digest, so
 * it never fails and the same copy is always available on /movers.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const digest = await buildMoversDigest(5);

  let posted = false;
  let webhookStatus: number | null = null;
  const webhook = process.env.WEEKLY_DIGEST_WEBHOOK_URL?.trim();
  // Skip a quiet week entirely so we never post "nothing happened".
  if (webhook && !digest.empty) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: digest.text,
          url: digest.url,
          weekOf: digest.weekOf,
          climbers: digest.climbers,
          newcomers: digest.newcomers,
        }),
        signal: AbortSignal.timeout(10000),
      });
      webhookStatus = res.status;
      posted = res.ok;
    } catch {
      // Never fail the cron on a webhook error; the digest is still returned.
    }
  }

  return NextResponse.json({
    ok: true,
    posted,
    webhookConfigured: Boolean(webhook),
    webhookStatus,
    skippedQuietWeek: digest.empty,
    weekOf: digest.weekOf,
    text: digest.text,
  });
}
