import { NextResponse } from "next/server";
import { normalizeHost, requestListingClaim } from "@/lib/listed";
import { getOptionalUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start a claim: mint a one-time secret code for the signed-in user to place on
 * their site. Login required — the code is tied to this user, and only they can
 * complete the claim (POST /api/list/claim/verify).
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

  const result = await requestListingClaim(host, user.id);
  if (result.ok) {
    return NextResponse.json({ ok: true, code: result.code, alreadyOwner: result.alreadyOwner ?? false });
  }
  return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
}
