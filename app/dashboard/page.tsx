import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddSiteForm } from "@/components/dashboard/add-site-form";
import { SiteManager } from "@/components/dashboard/site-manager";
import { GscProperties } from "@/components/dashboard/gsc-properties";
import { listUserProperties } from "@/lib/gsc-server";
import { siteConfig } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/auth";
import type { PublishedSite } from "@/lib/supabase/types";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  // Not configured yet (e.g. local dev without keys): show a setup notice.
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const user = await getOptionalUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: sites }, { data: connection }] = await Promise.all([
    supabase
      .from("published_sites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("connected_accounts")
      .select("google_email")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .maybeSingle(),
  ]);

  const mySites = (sites ?? []) as PublishedSite[];
  const googleConnected = Boolean(connection?.google_email);
  const liveCount = mySites.filter((s) => s.is_active).length;

  // When Google is connected, list verified properties and mark which are live.
  const activeUrls = new Set(
    mySites.filter((s) => s.is_active).map((s) => s.site_url),
  );
  const properties = googleConnected
    ? (await listUserProperties(user.id)).map((siteUrl) => ({
        siteUrl,
        published: activeUrls.has(siteUrl),
      }))
    : [];

  return (
    <div className="container max-w-4xl py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your sites</h1>
          <p className="mt-1 text-muted-foreground">
            Connected as <span className="text-foreground">{user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {liveCount} live · {mySites.length} total
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/channels">Channels →</Link>
          </Button>
        </div>
      </div>

      {/* Connect Google Search Console */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">Google Search Console</h2>
              {googleConnected ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="outline">Read-only</Badge>
              )}
            </div>
            {googleConnected ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Connected as{" "}
                <span className="text-foreground">{connection!.google_email}</span>.
                Verified clicks refresh automatically every{" "}
                {siteConfig.refreshCadenceHours} hours.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect to verify real organic clicks automatically. We request
                  only <code className="text-foreground">webmasters.readonly</code>.
                </p>
                <div className="mt-4">
                  <Button asChild>
                    <a href="/api/auth/google/start">
                      Connect with Google
                      <ArrowRight className="size-4" />
                    </a>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Verified Search Console properties */}
      {googleConnected && (
        <div className="mt-8">
          <h2 className="mb-1 text-lg font-semibold">Your verified properties</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Publish a property to fetch its real organic clicks and rank it on the
            leaderboard.
          </p>
          <GscProperties properties={properties} />
        </div>
      )}

      {/* Add a site manually */}
      <div className="mt-8">
        <h2 className="mb-1 text-lg font-semibold">
          {googleConnected ? "Or add a site manually" : "Publish a site"}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Add a site to the public leaderboard. Connect Search Console to verify
          its clicks — until then, seed values are used.
        </p>
        <div className="rounded-xl border border-border bg-card p-6">
          <AddSiteForm />
        </div>
      </div>

      {/* Manage sites */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Manage</h2>
        <SiteManager sites={mySites} />
      </div>

      <div className="mt-10 text-center">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← View the public leaderboard
        </Link>
      </div>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="container max-w-2xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <p className="flex items-center gap-2 font-medium">
          <Check className="size-5 text-primary" />
          Almost there — connect Supabase to enable accounts
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign-in and the publish flow are built and ready. They activate once
          Supabase keys are present. Add them to{" "}
          <code className="text-foreground">.env.local</code>:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs text-muted-foreground">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...`}
        </pre>
        <p className="mt-4 text-sm text-muted-foreground">
          Then run <code className="text-foreground">supabase/schema.sql</code> and{" "}
          <code className="text-foreground">npm run db:check</code> to verify.
        </p>
      </div>
      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Back to the leaderboard
        </Link>
      </div>
    </div>
  );
}
