"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Error boundary for the dashboard subtree (incl. /dashboard/channels).
 * Prevents a white-screen "client-side exception" and surfaces the error
 * reference so issues can be diagnosed instead of failing silently.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] render error:", error);
  }, [error]);

  return (
    <div className="container max-w-lg py-20 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This part of the dashboard hit an error. If you just added Channels, make
        sure the latest database schema has been applied.
      </p>
      {error.message && (
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
          {error.message}
        </pre>
      )}
      {error.digest && (
        <p className="mt-2 text-xs text-muted-foreground/70">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
