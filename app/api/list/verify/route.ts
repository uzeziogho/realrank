import { NextResponse } from "next/server";
import { normalizeHost, verifyOwnership } from "@/lib/listed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Badge check may fetch the site twice (bare + www), 10s each — give it room.
export const maxDuration = 30;

/**
 * Prove ownership of a listing: fetch the site and look for the RealRank
 * badge/link. On success the listing flips to owner_verified (dofollow). See
 * verifyOwnership() for the bounded fetch.
 */
export async function POST(req: Request) {
  let body: { host?: string; url?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const host = normalizeHost(body.host ?? body.url ?? "");
  if (!host) {
    return NextResponse.json({ ok: false, error: "A valid host is required." }, { status: 400 });
  }

  const result = await verifyOwnership(host);
  if (result.ok) {
    return NextResponse.json({ ok: true, verified: true });
  }
  return NextResponse.json({ ok: false, verified: false, error: result.error }, { status: 400 });
}
