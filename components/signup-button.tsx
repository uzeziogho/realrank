"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// clicks.page injects window.clicks once its t.js loads; it may be absent if the
// script is still loading or blocked, so every call is optional-chained.
declare global {
  interface Window {
    clicks?: { track: (event: string, meta?: Record<string, unknown>) => void };
  }
}

/**
 * The primary launch button on /login — RealRank's signup action (there is no
 * separate account step; the read-only Google Search Console connect is the
 * sign-up). Fires the clicks.page "signup" event, then follows the link to
 * start Google OAuth. The "read-only · ~30s" reassurance lives beside it.
 */
export function SignupButton() {
  return (
    <Button asChild size="lg" className="w-full">
      <a
        href="/api/auth/google/start"
        onClick={() => window.clicks?.track("signup")}
      >
        Connect Search Console
        <ArrowRight className="size-4" />
      </a>
    </Button>
  );
}
