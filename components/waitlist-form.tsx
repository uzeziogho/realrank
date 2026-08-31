"use client";

import { useActionState } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinWaitlist, type WaitlistState } from "@/app/waitlist/actions";

const initial: WaitlistState = {};

/**
 * Lightweight email capture for visitors not ready to connect Google.
 * `source` tags where the signup came from (e.g. "home", "login").
 */
export function WaitlistForm({ source = "home" }: { source?: string }) {
  const [state, formAction, pending] = useActionState(joinWaitlist, initial);

  if (state.success) {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-medium text-success">
        <Check className="size-4" /> {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
      <input type="hidden" name="source" value={source} />
      <input
        name="email"
        type="email"
        required
        placeholder="you@company.com"
        aria-label="Email"
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2"
      />
      <Button type="submit" variant="outline" disabled={pending} className="shrink-0">
        {pending ? <Loader2 className="size-4 animate-spin" /> : "Notify me"}
      </Button>
      {state.error && <p className="text-sm text-danger sm:hidden">{state.error}</p>}
    </form>
  );
}
