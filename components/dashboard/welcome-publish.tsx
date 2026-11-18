"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Globe, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publishFromWelcome } from "@/app/dashboard/actions";
import { hostname } from "@/lib/utils";

/**
 * The first step after connecting. One property → publish it straight away
 * (no extra click) while showing what's happening; several → one clear
 * "Rank this site" choice each; none → what to do in Search Console.
 */
export function WelcomePublish({ properties }: { properties: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  async function publish(siteUrl: string) {
    setBusy(siteUrl);
    setError(null);
    const res = await publishFromWelcome(siteUrl);
    if (res.error) {
      setError(res.error);
      setBusy(null);
      return;
    }
    router.refresh(); // the server page now shows the site's rank (or its waiting state)
  }

  useEffect(() => {
    if (properties.length === 1 && !started.current) {
      started.current = true;
      void publish(properties[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-sm">
        <p className="font-semibold">No verified site found on this Google account</p>
        <p className="mt-2 text-muted-foreground">
          RealRank can only rank a site you&apos;ve verified in Google Search Console. Add and verify your site there
          (it takes a few minutes), then come back and refresh this page — or sign in with the Google account that owns
          it.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
            Open Search Console
          </a>
        </Button>
      </div>
    );
  }

  if (busy) {
    return (
      <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/[0.05] p-6">
        <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
        <div>
          <p className="font-semibold">Ranking {hostname(busy)}…</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pulling your last 28 days of clicks from Google and placing you on the board. This takes a few seconds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="font-semibold">{properties.length === 1 ? "Rank your site" : "Which site should we rank?"}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        We found {properties.length} verified {properties.length === 1 ? "property" : "properties"} on your Google account.
        You can add more later from your dashboard.
      </p>
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
      <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
        {properties.map((p) => (
          <li key={p} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium">
              <Globe className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{hostname(p)}</span>
            </span>
            <Button size="sm" onClick={() => publish(p)}>
              Rank this site
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
