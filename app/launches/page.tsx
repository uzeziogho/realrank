import type { Metadata } from "next";
import Link from "next/link";
import { Rocket, TrendingUp, ShieldCheck, ArrowUpRight, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteFavicon } from "@/components/site-favicon";
import { Sparkline } from "@/components/sparkline";
import { getLeaderboardData, attachSparklines, getMovers } from "@/lib/data";
import { siteConfig, categoryLabel } from "@/lib/config";
import { formatCompact, formatGrowth, hostname, siteHref, timeAgo } from "@/lib/utils";
import type { RankedSite } from "@/lib/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Launch Your Site — Ranked by Real Traffic",
  description:
    "Launch your site on RealRank and get ranked today by real Google Search Console clicks — verified, updated daily. See this week's fastest climbers and the #1 Climber of the Week.",
  alternates: { canonical: "/launches" },
  openGraph: {
    title: "Launch Your Site — Ranked by Real Traffic",
    description:
      "Get ranked today by real Google Search Console clicks — verified, updated daily.",
    url: `${siteConfig.url}/launches`,
  },
};

/** ISO-8601 week number, for the dated "This week on RealRank" event label. */
function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export default async function LaunchesPage() {
  const [board, movers] = await Promise.all([
    getLeaderboardData("momentum"),
    getMovers(8),
  ]);

  // Newest verified sites first (includes warming-up sites so a launch is visible
  // the moment it connects).
  const newest = [...board.organic]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 12);
  // attachSparklines is typed for the general row union; these inputs are all
  // organic rows, so the results are safely RankedSite[].
  const justLaunched = (newest.length ? await attachSparklines(newest) : []) as RankedSite[];
  const climbing = (
    movers.climbers.length ? await attachSparklines(movers.climbers) : []
  ) as RankedSite[];

  // Social-proof row: favicons of the newest sites on the board (real verified
  // sites, the on-brand version of a founder-avatar row).
  const faviconRow = newest.slice(0, 8);
  // The dated weekly event: the single biggest verified momentum jump this week.
  const topClimber = climbing[0] ?? null;
  const now = new Date();
  const weekLabel = `Week ${isoWeek(now)}, ${now.getUTCFullYear()}`;

  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-14 text-center sm:py-20">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground">
            <Rocket className="size-4 text-primary" /> The verified launch board
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Launch your site. Ranked today by real traffic.
          </h1>
          <p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
            Your real Google Search Console clicks set your spot — verified, updated
            daily. Free, read-only, about 30 seconds.
          </p>
          {/* The reward, stated up front (what the founder actually gets). */}
          <p className="mt-3 max-w-xl text-balance text-sm text-muted-foreground">
            Every verified launch earns a badge, a profile buyers and AI assistants can
            cite, and a real backlink to your site.
          </p>

          {/* Social proof — real verified sites already on the board. */}
          {faviconRow.length > 0 && (
            <div className="mt-6 flex items-center justify-center">
              <div className="flex -space-x-2">
                {faviconRow.map((s) => (
                  <span
                    key={s.id}
                    className="flex size-9 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-card ring-1 ring-border"
                  >
                    <SiteFavicon url={s.siteUrl} name={s.displayName} />
                  </span>
                ))}
              </div>
              <span className="ml-3 text-sm text-muted-foreground">
                {formatCompact(board.totalSites)} verified{" "}
                {board.totalSites === 1 ? "site" : "sites"} on the board
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login">Get ranked</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/submit">List your project — free</Link>
              </Button>
            </div>
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              No votes · no pay-to-list · verified by Google
            </p>
          </div>
        </div>
      </section>

      <div className="container max-w-5xl space-y-12 py-12">
        {board.totalSites === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-lg font-medium">Be the first launch</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              The board is brand new. Connect Google Search Console and your verified
              site is the first on the launch board — or list your project free to start.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href="/login">Get ranked</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/submit">List your project — free</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* This week on RealRank — a dated event with a single winner, decided
                by verified momentum (not votes). The recurring reason to return. */}
            {topClimber && (
              <section className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                      <Trophy className="size-4" /> This week on {siteConfig.name} · {weekLabel}
                    </div>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                      #1 Climber of the Week
                    </h2>
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      The biggest verified momentum jump this week — decided by real
                      Google clicks, not votes.
                    </p>
                  </div>
                  <Link
                    href={`/site/${hostname(topClimber.siteUrl).toLowerCase()}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-card">
                      <SiteFavicon url={topClimber.siteUrl} name={topClimber.displayName} />
                    </span>
                    <div className="min-w-0 text-left">
                      <div className="truncate font-semibold">{topClimber.displayName}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {topClimber.rankDelta && topClimber.rankDelta > 0
                          ? `▲ ${topClimber.rankDelta} spots this week`
                          : "Climbing this week"}
                        {!topClimber.pending && ` · #${topClimber.rank}`}
                      </div>
                    </div>
                  </Link>
                </div>
              </section>
            )}

            {/* Just launched */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h2 className="text-xl font-semibold tracking-tight">Just launched</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {justLaunched.map((row) => (
                  <LaunchCard key={row.id} row={row} showJoined />
                ))}
              </div>
            </section>

            {/* Climbing this week */}
            {climbing.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="size-5 text-success" />
                  <h2 className="text-xl font-semibold tracking-tight">
                    Climbing this week
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {climbing.map((row) => (
                    <LaunchCard key={row.id} row={row} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Why launch here */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <Reason
              icon={<ShieldCheck className="size-5" />}
              title="Verified, not pay-to-list"
              body="Your spot is decided by real Search Console clicks. No bidding, no self-reported numbers."
            />
            <Reason
              icon={<TrendingUp className="size-5" />}
              title="Momentum wins"
              body="A brand-new site growing fast can out-launch a flat incumbent — the board rewards velocity."
            />
            <Reason
              icon={<ArrowUpRight className="size-5" />}
              title="A real backlink"
              body="Every verified listing links straight to your site, so a launch here compounds as the board grows."
            />
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-border/60 pt-6 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href="/login">Get ranked</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/submit">List your project — free</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Connect Google Search Console (read-only) · about 30 seconds — or list free, no login
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function LaunchCard({ row, showJoined = false }: { row: RankedSite; showJoined?: boolean }) {
  const host = hostname(row.siteUrl).toLowerCase();
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
              <span className="text-lg font-bold tabular-nums">#{row.rank}</span>
              {row.rankDelta != null && row.rankDelta > 0 && (
                <span className="text-xs font-medium text-success">▲{row.rankDelta}</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex gap-4">
          <Metric label="Momentum" value={row.pending ? "—" : row.momentumScore.toFixed(0)} />
          <Metric label="7d clicks" value={formatCompact(row.clicks7d)} />
          <Metric label="Growth" value={row.pending ? "—" : formatGrowth(row.growthRate)} />
        </div>
        {!row.pending && row.spark.length >= 3 && (
          <Sparkline data={row.spark} width={80} height={26} />
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        {row.category && (
          <Badge variant="outline" className="shrink-0">
            {categoryLabel(row.category)}
          </Badge>
        )}
        {showJoined && <span>Joined {timeAgo(row.createdAt)}</span>}
        <a
          href={siteHref(row.siteUrl)}
          target="_blank"
          rel="noopener nofollow"
          className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
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

function Reason({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-3 font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
