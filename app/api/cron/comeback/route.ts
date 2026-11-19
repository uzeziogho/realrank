import { NextRequest, NextResponse } from "next/server";
import { runComeback } from "@/lib/comeback";
import { notifyAdmin } from "@/lib/admin-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Comeback emails (Vercel Cron, daily after the 06:00 refresh). Alerts go out
 * any day; the weekly owner and listing reports go out on Mondays. Sends
 * nothing until COMEBACK_EMAILS_ENABLED is "true" (see lib/comeback.ts).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const report = await runComeback();
  const sent = report.sent.owner_weekly + report.sent.owner_alert + report.sent.listing_weekly;
  if (sent > 0 || report.failed > 0) {
    await notifyAdmin({
      kind: report.failed > 0 ? "warning" : "info",
      title: `Comeback emails: ${sent} sent${report.failed ? `, ${report.failed} failed` : ""}`,
      body: `Weekly reports: ${report.sent.owner_weekly} · rank alerts: ${report.sent.owner_alert} · listing reports: ${report.sent.listing_weekly}`,
      link: "/admin/emails",
    });
  }
  // Drafts hold addresses and full text — counts only in the response.
  const { drafts, ...summary } = report;
  return NextResponse.json({ ok: true, ...summary, drafted: drafts.length });
}
