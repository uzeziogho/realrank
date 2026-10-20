import { NextRequest, NextResponse } from "next/server";
import { unsubTokenValid, unsubscribe } from "@/lib/digest-email";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Unsubscribe from the weekly digest, from the link in the email.
 *
 * GET is what a reader clicks; POST is what a mail client sends for one-click
 * unsubscribe (RFC 8058, via the List-Unsubscribe-Post header the digest sets).
 * Both honour the same signed link: the address plus an HMAC of it, so a link
 * can't be edited to opt out somebody else.
 *
 * No login, no confirmation step. Making someone prove who they are to stop
 * receiving mail they didn't ask for is how you end up marked as spam.
 */
async function handle(req: NextRequest): Promise<Response> {
  const email = (req.nextUrl.searchParams.get("e") ?? "").trim().toLowerCase();
  const token = (req.nextUrl.searchParams.get("t") ?? "").trim();

  if (!email || !token || !unsubTokenValid(email, token)) {
    return page("That unsubscribe link isn't valid.", `Email ${siteConfig.email.support} and we'll take you off the list by hand.`, 400);
  }

  const ok = await unsubscribe(email);
  if (!ok) {
    return page("Couldn't save that just now.", `Try the link again, or email ${siteConfig.email.support} and we'll do it by hand.`, 500);
  }

  return page("You're unsubscribed.", `${email} won't receive the ${siteConfig.name} digest again.`, 200);
}

export const GET = handle;
export const POST = handle;

/** A plain, self-contained page — no layout, no JS, works in any mail client's browser. */
function page(title: string, body: string, status: number): Response {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return new NextResponse(
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(title)} — ${esc(siteConfig.name)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         font:16px/1.5 system-ui, sans-serif; padding:24px; }
  main { max-width:32rem; text-align:center; }
  h1 { font-size:1.25rem; margin:0 0 .5rem; }
  p { margin:0; opacity:.75; }
  a { color:inherit; }
</style></head>
<body><main>
  <h1>${esc(title)}</h1>
  <p>${esc(body)}</p>
  <p style="margin-top:1.5rem"><a href="${esc(siteConfig.url)}">${esc(siteConfig.name)}</a></p>
</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}
