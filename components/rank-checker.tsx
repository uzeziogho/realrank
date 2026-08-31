"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Where do you rank?" — a domain input that personalizes the connect CTA.
 * If the domain is already on the board, deep-links to its profile; otherwise
 * frames the gap ("not ranked yet") and drives to connect. We can't know an
 * un-connected site's real clicks, so we never fabricate a rank — we show the
 * benchmark to beat and make the next step obvious.
 */
function normalizeHost(input: string): string {
  let v = input.trim().toLowerCase();
  v = v.replace(/^https?:\/\//, "").replace(/^www\./, "");
  v = v.split("/")[0].split("?")[0];
  return v;
}

export function RankChecker({
  knownHosts,
  topClicks,
  totalSites,
}: {
  knownHosts: string[];
  topClicks: number;
  totalSites: number;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<null | { host: string; ranked: boolean }>(null);

  const known = new Set(knownHosts);

  function check(e: React.FormEvent) {
    e.preventDefault();
    const host = normalizeHost(value);
    if (!host || !host.includes(".")) return;
    setResult({ host, ranked: known.has(host) });
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={check} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="yourdomain.com"
            aria-label="Your domain"
            className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus-visible:ring-2"
          />
        </div>
        <Button type="submit" size="lg" className="shrink-0">
          Where do I rank? <ArrowRight className="size-4" />
        </Button>
      </form>

      {result && (
        <div className="mt-3 rounded-xl border border-border bg-card p-4 text-left text-sm">
          {result.ranked ? (
            <p className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" />
              <span>
                <strong>{result.host}</strong> is already ranked —{" "}
                <Link href={`/site/${result.host}`} className="text-primary hover:underline">
                  view its momentum →
                </Link>
              </span>
            </p>
          ) : (
            <div>
              <p className="font-medium text-foreground">
                {result.host} isn&apos;t on the board yet.
              </p>
              <p className="mt-1 text-muted-foreground">
                Connect Google Search Console to claim its spot — it&apos;s free, read-only,
                and its verified momentum shows up immediately.
                {topClicks > 0 && (
                  <> The current leader has {formatK(topClicks)} clicks in 28 days.</>
                )}
              </p>
              <Button asChild className="mt-3">
                <Link href="/login">Claim {result.host} <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {!result && totalSites > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {formatK(totalSites)} sites ranked so far · verified via Google Search Console
        </p>
      )}
    </div>
  );
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
