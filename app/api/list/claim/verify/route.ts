import { NextResponse } from "next/server";
import { normalizeHost, verifyListingClaim } from "@/lib/listed";
import { getOptionalUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Fetches the site (bare + www, 10s each) to look for the claim code.
export const maxDuration = 30;

/**
 * Complete a claim: fetch the site and confirm the signed-in user's one-time
 * code is present. On success the listing's claimed_by is set to this user.
 */
export async function POST(req: Request) {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to claim a listing." }, { status: 401 });
  }

  let body: { host?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const host = normalizeHost(body.host ?? "");
  if (!host) return NextResponse.json({ ok: false, error: "A valid host is required." }, { status: 400 });

  const result = await verifyListingClaim(host, user.id);
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
}
