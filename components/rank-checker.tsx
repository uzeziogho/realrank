"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { Search, ArrowRight, CheckCircle2, Bell, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { joinWaitlist, type WaitlistState } from "@/app/waitlist/actions";

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

              {/* Low-friction fallback — capture the high-intent moment without OAuth. */}
              <NotifyInline host={result.host} />
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

const notifyInitial: WaitlistState = {};

/**
 * Inline "notify me" capture shown right after a domain check. Most first-time
 * visitors won't connect Google on the spot, so this converts the high-intent
 * moment into a lead instead of a bounce. The checked domain rides along in
 * `source` so we know what they wanted to claim.
 */
function NotifyInline({ host }: { host: string }) {
  const [state, formAction, pending] = useActionState(joinWaitlist, notifyInitial);

  if (state.success) {
    return (
      <p className="mt-3 inline-flex items-center gap-2 border-t border-border pt-3 text-sm font-medium text-success">
        <Check className="size-4" /> Done — we&apos;ll email you the moment {host} can claim its spot.
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Bell className="size-3.5" /> Not ready to connect? Get notified when {host} can claim its spot.
      </p>
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="source" value={`checker:${host}`.slice(0, 60)} />
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
      </form>
      {state.error && <p className="mt-1 text-sm text-danger">{state.error}</p>}
    </div>
  );
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
