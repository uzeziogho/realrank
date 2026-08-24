import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Check, ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DUMMY_SITES } from "@/lib/dummy-data";
import { formatCompact, formatGrowth, hostname } from "@/lib/utils";

// Private surface — keep it out of search results.
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  const authReady = isSupabaseConfigured();
  // Preview: pretend the first few seed sites belong to the current user.
  const mySites = DUMMY_SITES.slice(0, 3);

  return (
    <div className="container max-w-4xl py-12">
      <h1 className="text-3xl font-bold tracking-tight">Your sites</h1>
      <p className="mt-1 text-muted-foreground">
        Connect Google Search Console, choose which properties to publish, and
        watch your rank.
      </p>

      {/* Step 1 — Connect */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Connect Google Search Console</h2>
              <Badge variant="outline">Read-only</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              We request only <code className="text-foreground">webmasters.readonly</code>.
              We can never modify your site. Your token is encrypted and never
              leaves the server.
            </p>
            <div className="mt-4">
              {authReady ? (
                <Button asChild>
                  <a href="/api/auth/google/start">
                    Connect with Google
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
              ) : (
                <Button disabled title="Set Supabase + Google env vars to enable">
                  Connect with Google
                </Button>
              )}
            </div>
            {!authReady && (
              <p className="mt-3 text-xs text-muted-foreground">
                Auth is not configured yet. Add your Supabase and Google OAuth
                credentials to <code>.env.local</code> to enable the live
                connection. The table below is a preview of the manage-sites UI.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Step 2 — Select & publish (preview) */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Select properties to publish</h2>
          <span className="text-sm text-muted-foreground">
            {mySites.length} verified
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {mySites.map((site) => (
              <li
                key={site.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Globe className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{site.display_name}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {hostname(site.site_url)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden text-right sm:block">
                    <p className="font-semibold tabular-nums">
                      {formatCompact(site.clicks_28d)}
                    </p>
                    <p className="text-xs text-success">
                      {formatGrowth(site.growth_rate)} momentum
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                    <Check className="size-3.5" />
                    Published
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Toggling and category selection become active once your Google account
          is connected. Data refreshes automatically every{" "}
          {siteConfig.refreshCadenceHours} hours.
        </p>
      </div>

      <div className="mt-10 text-center">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Back to the public leaderboard
        </Link>
      </div>
    </div>
  );
}
