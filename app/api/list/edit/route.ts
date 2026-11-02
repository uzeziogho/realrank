import { NextResponse } from "next/server";
import { normalizeHost, updateListing, type UpdateListingInput } from "@/lib/listed";
import { getOptionalUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Save edits to a listing. Login required; updateListing() enforces that the
 * signed-in user is the one who claimed it, and validates every field.
 */
export async function POST(req: Request) {
  const user = await getOptionalUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in to edit a listing." }, { status: 401 });
  }

  let body: { host?: string } & UpdateListingInput = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const host = normalizeHost(body.host ?? "");
  if (!host) return NextResponse.json({ ok: false, error: "A valid host is required." }, { status: 400 });

  const result = await updateListing(host, user.id, {
    displayName: body.displayName,
    tagline: body.tagline,
    description: body.description,
    category: body.category,
    alternativeTo: body.alternativeTo,
    pricing: body.pricing,
    platforms: body.platforms,
    details: body.details,
  });
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
}
