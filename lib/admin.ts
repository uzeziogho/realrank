import "server-only";

import { notFound, redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/auth";

/**
 * Site-owner gate for /admin. Admins are the signed-in Google accounts listed
 * in ADMIN_EMAILS (comma-separated), falling back to OWNER_EMAIL. Anyone else
 * gets a plain 404, so the page doesn't advertise that it exists. Call it at
 * the top of every admin page AND every admin server action — actions are
 * public endpoints in their own right.
 */
export function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim() || process.env.OWNER_EMAIL?.trim() || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(nextPath = "/admin/placements") {
  const user = await getOptionalUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  const email = user.email?.toLowerCase();
  if (!email || !adminEmails().includes(email)) notFound();
  return user;
}
