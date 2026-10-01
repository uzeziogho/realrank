import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaderboardSection } from "@/components/leaderboard-section";
import { JustListed } from "@/components/just-listed";
import { getLeaderboardData, getSiteTraffic } from "@/lib/data";
import { getListedSites } from "@/lib/listed";
import { BadgeMarquee } from "@/components/badge-marquee";
import { siteConfig } from "@/lib/config";
import { formatCompact } from "@/lib/utils";

// How many freshly-listed projects to preview under the board (verified-owner
// listings sort first, so the head of the list is the highest-trust slice).
const HOMEPAGE_LISTED_LIMIT = 6;

// Incremental Static Regeneration — full ranked list is in the initial HTML,
// refreshed at most hourly (and on-demand after the cron writes new data).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fastest-Growing Websites by Organic Traffic",
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // The homepage is the board. It renders the default momentum view so it
  // prerenders (ISR) and serves cached HTML — search, the volume toggle, the
  // rank checker and every marketing section live on their own pages
  // (/leaderboard, /about, /movers, /founding), reachable from the nav.
  const [data, traffic, listed] = await Promise.all([
    getLeaderboardData("momentum"),
    getSiteTraffic(),
    getListedSites(),
  ]);

  return (
    <>
      {/* Slim board header — SEO h1 + one-line frame + live stats. Just enough to
          set the board up; everything else is one click away in the nav. */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-10 text-center sm:py-14">
          {/* Live activity pill — real first-party numbers, makes the board feel active. */}
          <div className="mb-5 inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            <Link
              href="/founding"
              className="font-medium text-foreground hover:text-primary"
              title={`The first ${data.founding.total} verified sites get permanent founder status`}
            >
              Founding {data.founding.claimed}/{data.founding.total}
            </Link>
            <span className="text-border">·</span>
            <PillStat value={traffic.sessions} label="sessions" />
            <span className="text-border">·</span>
            <PillStat value={traffic.visitors} label="visitors" />
            <span className="text-border">·</span>
            <Link href="/stats" className="font-medium text-primary hover:underline">stats →</Link>
          </div>

          <h1 className="max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            The organic-growth leaderboard.
          </h1>
          <p className="mt-4 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            <ShieldCheck
              className="mr-1.5 inline-block size-4 align-[-0.2em] text-primary"
              aria-hidden="true"
            />
            Ranked by opted-in Google Search Console clicks — momentum, not votes or estimates.
          </p>

          {/* $0 entry point: list free today, upgrade to a verified rank later. */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <Button asChild size="lg">
              <Link href="/submit">
                <Plus className="size-4" /> List your project — free
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Free, permanent link ·{" "}
              <Link href="/login" className="underline underline-offset-2 hover:text-foreground">
                connect Search Console
              </Link>{" "}
              to get a verified rank
            </p>
          </div>
        </div>
      </section>

      {/* Board 1 — the verified momentum leaderboard (the thesis). */}
      <LeaderboardSection
        data={data}
        view="momentum"
        query=""
        page={1}
        interactive={false}
      />

      {/* Board 2 — the open directory of freshly listed projects. Visually
          separated and unranked so it never reads as a verified ranking. */}
      <JustListed listings={listed.slice(0, HOMEPAGE_LISTED_LIMIT)} total={listed.length} />

      {/* Featured-on badges — scrolling marquee */}
      <BadgeMarquee />
    </>
  );
}

function PillStat({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-semibold tabular-nums text-foreground">{formatCompact(value)}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
