import { NextRequest } from "next/server";
import { getOptionalUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { runComeback } from "@/lib/comeback";
import { comebackHtml, SAMPLE_LINE } from "@/lib/comeback-html";

export const dynamic = "force-dynamic";

/**
 * The designed (React Email) version of a comeback email, as a page, for the
 * iframes on /admin/emails. ?sample=weekly|top renders example data; ?kind=…
 * &to=… renders that draft from a dry run (nothing is sent or recorded).
 * Admin only.
 */
export async function GET(req: NextRequest) {
  const user = await getOptionalUser();
  if (!user || !isAdminEmail(user.email)) return new Response("Not found", { status: 404 });

  const sp = req.nextUrl.searchParams;
  const unsub = "#unsubscribe";
  let html: string | undefined;

  if (sp.get("sample") === "weekly") {
    html = await comebackHtml.weekly(
      [SAMPLE_LINE, { ...SAMPLE_LINE, siteId: "sample-2", name: "Side Project", host: "side.dev", rank: null, prevRank: null }],
      unsub,
      new Date(),
    );
  } else if (sp.get("sample") === "top") {
    html = await comebackHtml.top({ ...SAMPLE_LINE, rank: 1, nextUp: null, listed: true, growth: 0.92 }, 4, unsub);
  } else {
    const report = await runComeback({ dryRun: true, forceWeekly: true, html: comebackHtml });
    html = report.drafts.find((d) => d.kind === sp.get("kind") && d.to === sp.get("to"))?.html;
  }

  if (!html) return new Response("No designed version for this email.", { status: 404, headers: { "content-type": "text/plain" } });
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      // Shown only inside our own admin page; never framed elsewhere.
      "x-frame-options": "SAMEORIGIN",
      "content-security-policy": "frame-ancestors 'self'; script-src 'none'",
    },
  });
}
