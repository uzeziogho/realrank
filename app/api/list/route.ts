import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createListing, normalizeHost, checkNameAvailable } from "@/lib/listed";
import { sendEmail, listingConfirmationEmail } from "@/lib/email";
import { offTopicReason } from "@/lib/offtopic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Submission runs a liveness fetch (bare + www, 10s each) and an AI screen
// (~15s). Give the whole gate room so a slow host can't trip the timeout.
export const maxDuration = 45;

/** First hop of X-Forwarded-For, for a coarse per-IP rate limit. */
function clientIp(xff: string | null, real: string | null): string | null {
  const first = xff?.split(",")[0]?.trim();
  return first || real || null;
}

/**
 * Regions whose submissions are silently dropped, by ISO-3166-1 alpha-2 code
 * from Vercel's `x-vercel-ip-country` header. Mainland China only (CN) — Hong
 * Kong (HK), Macau (MO) and Taiwan (TW) are allowed through. Edit this set to
 * change coverage. This is a volume filter — a VPN routes around IP geo, which
 * is why the content fit gate below runs too. Fail-open: the header is absent
 * off Vercel, so an unknown country is allowed through.
 */
const BLOCKED_COUNTRIES = new Set(["CN"]);


/**
 * Create an open "$0" listing. Server-side validation + spam guards live in
 * createListing(); this route adds a honeypot (`company`) that real users never
 * fill. Inserts run with the service role — the table has no open RLS insert.
 */
/**
 * Inline name check for the submit form: GET /api/list?name=… → is that project
 * name free? Advisory only — the POST re-checks, and a DB index backs both.
 */
export async function GET(req: Request) {
  const name = (new URL(req.url).searchParams.get("name") ?? "").slice(0, 120);
  const result = await checkNameAvailable(name);
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  let body: {
    url?: string;
    name?: string;
    tagline?: string;
    description?: string;
    category?: string;
    alternativeTo?: string;
    pricing?: string;
    platforms?: string[];
    details?: string;
    email?: string;
    company?: string; // honeypot — must stay empty
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Honeypot tripped: respond as if accepted so bots don't learn, but store nothing.
  if (body.company && body.company.trim().length > 0) {
    return NextResponse.json({ ok: true, host: null, ownerVerified: false });
  }

  const h = await headers();

  // Geo gate: submissions from blocked regions are silently accepted and then
  // discarded (same response shape as the honeypot), so a blocked source isn't
  // told it was blocked. Runs alongside the content fit gate below — this one
  // catches submissions FROM the region, that one catches Chinese-content / .cn
  // listings wherever they come from. Fail-open when the country is unknown.
  const country = h.get("x-vercel-ip-country")?.toUpperCase();
  if (country && BLOCKED_COUNTRIES.has(country)) {
    return NextResponse.json({ ok: true, host: null, ownerVerified: false });
  }

  // Fit gate (content, not nationality): a listing written in Chinese or on a
  // .cn domain targets the Baidu/mainland market this board can't rank and its
  // audience can't read. Silently accepted and discarded (same shape as the
  // honeypot) so it isn't told why. A Chinese founder's English listing for a
  // global product has no Han content and a .com — it passes untouched.
  if (offTopicReason({ host: normalizeHost(body.url ?? ""), displayName: body.name, tagline: body.tagline, description: body.description })) {
    return NextResponse.json({ ok: true, host: null, ownerVerified: false });
  }

  if (!body.url || !body.name) {
    return NextResponse.json({ ok: false, error: "A URL and a project name are required." }, { status: 400 });
  }

  const ip = clientIp(h.get("x-forwarded-for"), h.get("x-real-ip"));

  const result = await createListing(
    {
      url: body.url,
      displayName: body.name,
      tagline: body.tagline,
      description: body.description,
      category: body.category,
      alternativeTo: body.alternativeTo,
      pricing: body.pricing,
      platforms: body.platforms,
      details: body.details,
      email: body.email,
    },
    ip,
  );

  if (result.ok) {
    // Transactional confirmation to the submitter's own address — their link +
    // how to claim the checkmark. Best-effort: awaited so it runs before the
    // serverless function returns, but it never throws and never blocks the
    // response from reporting success. Only when an address was given and the
    // listing actually got a host.
    const email = body.email?.trim();
    if (email && email.includes("@") && result.host) {
      const { subject, text, html } = listingConfirmationEmail({
        displayName: body.name,
        host: result.host,
      });
      await sendEmail({ to: email, subject, text, html });
    }
    return NextResponse.json({ ok: true, host: result.host, ownerVerified: result.ownerVerified });
  }

  const status =
    result.code === "duplicate" || result.code === "ranked" || result.code === "name_taken"
      ? 409
      : result.code === "rate_limited"
        ? 429
        : result.code === "unavailable"
          ? 503
          : result.code === "server"
            ? 500
            : result.code === "badge_missing"
              ? 422
              : result.code === "unreachable"
                ? 502
                : 400;
  return NextResponse.json({ ok: false, error: result.error, code: result.code }, { status });
}
