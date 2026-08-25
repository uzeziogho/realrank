import "server-only";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { requireEnv } from "@/lib/supabase/env";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

/**
 * Request-scoped Supabase client that respects the signed-in user's session
 * (and therefore RLS). Use in Server Components, Route Handlers, and Actions.
 *
 * Return type is pinned to supabase-js's `SupabaseClient<Database>` so table
 * insert/upsert payloads are fully typed for callers.
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookies are read-only here.
            // Session refresh is handled by middleware instead.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS — use ONLY on the server for trusted work
 * (cron refresh, admin reads). Never import into client code.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    SUPABASE_URL,
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
