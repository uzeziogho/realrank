import "server-only";

import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the signed-in user, or null when nobody is signed in or Supabase
 * isn't configured yet. Safe to call from any Server Component / route — it
 * never throws on missing env, so the app still renders during local dev.
 */
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
