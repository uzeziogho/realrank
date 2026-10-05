import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createListing } from "@/lib/listed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** First hop of X-Forwarded-For, for a coarse per-IP rate limit. */
function clientIp(xff: string | null, real: string | null): string | null {
  const first = xff?.split(",")[0]?.trim();
  return first || real || null;
}

/**
 * Create an open "$0" listing. Server-side validation + spam guards live in
 * createListing(); this route adds a honeypot (`company`) that real users never
 * fill. Inserts run with the service role — the table has no open RLS insert.
 */
export async function POST(req: Request) {
  let body: {
    url?: string;
    name?: string;
    tagline?: string;
    description?: string;
    category?: string;
    alternativeTo?: string;
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

  if (!body.url || !body.name) {
    return NextResponse.json({ ok: false, error: "A URL and a project name are required." }, { status: 400 });
  }

  const h = await headers();
  const ip = clientIp(h.get("x-forwarded-for"), h.get("x-real-ip"));

  const result = await createListing(
    {
      url: body.url,
      displayName: body.name,
      tagline: body.tagline,
      description: body.description,
      category: body.category,
      alternativeTo: body.alternativeTo,
      email: body.email,
    },
    ip,
  );

  if (result.ok) {
    return NextResponse.json({ ok: true, host: result.host, ownerVerified: result.ownerVerified });
  }

  const status =
    result.code === "duplicate"
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
