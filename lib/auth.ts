import "server-only";

import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the signed-in user, or null when nobody is signed in or Supabase
 * isn't configured yet. Safe to call from any Server Component / route — it
 * never throws on missing env, so the app still renders during local dev.
 */
/** The product owner's email — set OWNER_EMAIL in the environment. */
const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();

/**
 * True when the given email is the configured product owner. Used to gate
 * owner-only surfaces (e.g. the Analytics dashboard). Returns false when
 * OWNER_EMAIL isn't set, so nothing owner-only leaks by default.
 */
export function isOwner(email?: string | null): boolean {
  return Boolean(OWNER_EMAIL && email && email.trim().toLowerCase() === OWNER_EMAIL);
}

export async function getOptionalUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
