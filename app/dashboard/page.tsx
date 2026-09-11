import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  ArrowRight,
  Check,
  TrendingUp,
  Trophy,
  MousePointerClick,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddSiteForm } from "@/components/dashboard/add-site-form";
import { SiteManager } from "@/components/dashboard/site-manager";
import { GscProperties } from "@/components/dashboard/gsc-properties";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { SiteFavicon } from "@/components/site-favicon";
import { Sparkline } from "@/components/sparkline";
import { listUserProperties } from "@/lib/gsc-server";
import { getLeaderboardData, attachSparklines } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getOptionalUser } from "@/lib/auth";
import { formatCompact, formatGrowth, hostname, siteHref } from "@/lib/utils";
import type { PublishedSite } from "@/lib/supabase/types";
import type { RankedSite } from "@/lib/types";

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
  const liveSites = mySites.filter((s) => s.is_active);
  const liveCount = liveSites.length;

  // When Google is connected, list verified properties and mark which are live.
  const activeUrls = new Set(liveSites.map((s) => s.site_url));
  const properties = googleConnected
    ? (await listUserProperties(user.id)).map((siteUrl) => ({
        siteUrl,
        published: activeUrls.has(siteUrl),
      }))
    : [];

  // Pull the live board once and match this user's active sites to their ranked
  // rows so the overview can show real rank / momentum / trend, not raw fields.
  const board = liveCount > 0 ? await getLeaderboardData("momentum") : null;
  const byHost = new Map(
    (board?.organic ?? []).map((r) => [hostname(r.siteUrl).toLowerCase(), r]),
  );
  const matched = liveSites
    .map((s) => byHost.get(hostname(s.site_url).toLowerCase()))
    .filter((r): r is RankedSite => Boolean(r));
  // attachSparklines is typed for the general row union; `matched` is all
  // organic (no sponsored rows), so the result is safely RankedSite[].
  const myRows =
    matched.length > 0 ? ((await attachSparklines(matched)) as RankedSite[]) : [];

  // KPIs.
  const ranked = myRows.filter((r) => !r.pending);
  const bestRank = ranked.length ? Math.min(...ranked.map((r) => r.rank)) : null;
  const clicks7d = liveSites.reduce((sum, s) => sum + s.clicks_7d, 0);
  const clicks28d = liveSites.reduce((sum, s) => sum + s.clicks_28d, 0);

  return (
    <div className="container max-w-5xl py-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{user.email}</span>
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            View public board
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </header>

      <DashboardTabs />

      {liveCount > 0 ? (
        <>
          {/* KPI row */}
          <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Live sites"
              value={String(liveCount)}
              sub={mySites.length > liveCount ? `${mySites.length} total` : "on the board"}
              icon={<Globe className="size-4 text-muted-foreground" />}
            />
            <StatCard
              label="Best rank"
              value={bestRank ? `#${bestRank}` : "—"}
              sub={bestRank ? "by momentum" : "warming up"}
              icon={<Trophy className="size-4 text-muted-foreground" />}
            />
            <StatCard
              label="Clicks (7d)"
              value={formatCompact(clicks7d)}
              sub="verified, last 7 days"
              icon={<MousePointerClick className="size-4 text-muted-foreground" />}
            />
            <StatCard
              label="Clicks (28d)"
              value={formatCompact(clicks28d)}
              sub="verified, last 28 days"
              icon={<TrendingUp className="size-4 text-muted-foreground" />}
            />
          </section>

          {/* Your sites overview */}
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your sites</h2>
              <span className="text-xs text-muted-foreground">
                Refreshes every {siteConfig.refreshCadenceHours} hours
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {myRows.map((row) => (
                <SiteOverviewCard key={row.id} row={row} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <Onboarding googleConnected={googleConnected} />
      )}

      {/* Setup: connect, verified properties, add a site */}
      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Setup
        </h2>

        {/* Connect Google Search Console */}
        <div className="mt-4 rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">Google Search Console</h3>
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
          <div className="mt-6">
            <h3 className="mb-1 text-base font-semibold">Your verified properties</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Publish a property to fetch its real organic clicks and rank it on the
              leaderboard.
            </p>
            <GscProperties properties={properties} />
          </div>
        )}

        {/* Add a site manually */}
        <div className="mt-6">
          <h3 className="mb-1 text-base font-semibold">
            {googleConnected ? "Or add a site manually" : "Publish a site"}
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Add a site to the public leaderboard. Connect Search Console to verify its
            clicks — until then, seed values are used.
          </p>
          <div className="rounded-xl border border-border bg-card p-6">
            <AddSiteForm />
          </div>
        </div>
      </section>

      {/* Manage */}
      {mySites.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Manage sites
          </h2>
          <SiteManager sites={mySites} />
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SiteOverviewCard({ row }: { row: RankedSite }) {
  const host = hostname(row.siteUrl).toLowerCase();
  const delta = row.rankDelta;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <SiteFavicon url={row.siteUrl} name={row.displayName} />
        <div className="min-w-0">
          <Link href={`/site/${host}`} className="block truncate font-semibold hover:underline">
            {row.displayName}
          </Link>
          <span className="text-xs text-muted-foreground">{host}</span>
        </div>
        <div className="ml-auto text-right">
          {row.pending ? (
            <span className="text-xs font-semibold uppercase tracking-wide text-primary">
              New
            </span>
          ) : (
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-xl font-bold tabular-nums">#{row.rank}</span>
              {delta != null && delta !== 0 && (
                <span
                  className={
                    delta > 0
                      ? "text-xs font-medium text-success"
                      : "text-xs font-medium text-danger"
                  }
                >
                  {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex gap-5">
          <Metric label="Momentum" value={row.pending ? "—" : row.momentumScore.toFixed(0)} />
          <Metric label="7d clicks" value={formatCompact(row.clicks7d)} />
          <Metric
            label="Growth"
            value={row.pending ? "—" : formatGrowth(row.growthRate)}
          />
        </div>
        {!row.pending && row.spark.length >= 3 && (
          <Sparkline data={row.spark} width={92} height={30} />
        )}
      </div>

      <div className="flex items-center gap-4 border-t border-border/60 pt-3 text-xs">
        <Link
          href={`/dashboard/leaks?site=${encodeURIComponent(row.siteUrl)}`}
          className="font-medium text-primary hover:underline"
        >
          Find leaks →
        </Link>
        <a
          href={siteHref(row.siteUrl)}
          target="_blank"
          rel="noopener nofollow"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          Visit <ArrowUpRight className="size-3" />
        </a>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Onboarding({ googleConnected }: { googleConnected: boolean }) {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-8 text-center sm:p-10">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
        <TrendingUp className="size-6" />
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">
        Let&apos;s get your first site on the board
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Connect Google Search Console (read-only) and your verified clicks decide your
        rank. About 30 seconds, and nothing is public until you publish it.
      </p>
      {googleConnected ? (
        <p className="mt-5 text-sm text-muted-foreground">
          You&apos;re connected — publish a verified property in{" "}
          <span className="text-foreground">Setup</span> below to go live.
        </p>
      ) : (
        <Button asChild size="lg" className="mt-6">
          <a href="/api/auth/google/start">
            Connect Google Search Console
            <ArrowRight className="size-4" />
          </a>
        </Button>
      )}
      <div className="mx-auto mt-8 grid max-w-lg gap-3 text-left sm:grid-cols-3">
        <Step n={1} title="Connect" body="Read-only Search Console access." />
        <Step n={2} title="Publish" body="Pick which sites go on the board." />
        <Step n={3} title="Rank" body="Real momentum decides your spot." />
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <div className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
        {n}
      </div>
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
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
