import { NextResponse, type NextRequest } from "next/server";
import { sendDueSpotlightEmails } from "@/lib/placements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily paid-placement upkeep. Spotlight runs get one reminder about a day
 * before they end (with an extend link) and one honest results summary just
 * after. Expiry itself needs no job: every surface compares the end date to
 * the current time. Sponsor slots are driven by Dodo's subscription events.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendDueSpotlightEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron placements]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
