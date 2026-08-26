"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Auth-aware header nav rendered on the client so the surrounding layout stays
 * statically rendered (critical for leaderboard crawlability). The SSR output is
 * the logged-out state — correct for crawlers — and swaps to the signed-in state
 * after hydration if a Supabase session exists.
 */
export function AuthNav() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;

    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (active) setSignedIn(Boolean(user));
      supabase.auth.onAuthStateChange((_event, session) => {
        if (active) setSignedIn(Boolean(session?.user));
      });
    })();

    return () => {
      active = false;
    };
  }, []);

  async function handleSignOut() {
    const { createClient } = await import("@/lib/supabase/client");
    await createClient().auth.signOut();
    window.location.href = "/";
  }

  if (signedIn) {
    return (
      <>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
        <Button onClick={handleSignOut} variant="outline" size="sm">
          Disconnect
        </Button>
      </>
    );
  }

  return (
    <Button asChild size="sm">
      <Link href="/login">Connect Search Console</Link>
    </Button>
  );
}
