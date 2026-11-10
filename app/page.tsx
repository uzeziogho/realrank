import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaderboardSection } from "@/components/leaderboard-section";
import { JustListed } from "@/components/just-listed";
import { SpotlightLane } from "@/components/spotlight-lane";
import { activeSpotlights, spotlightAvailability } from "@/lib/spotlight";
import { getLeaderboardData, getSiteTraffic, getOutboundClicks } from "@/lib/data";
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
  const [data, traffic, listed, outboundClicks] = await Promise.all([
    getLeaderboardData("momentum"),
    getSiteTraffic(),
    getListedSites(),
    // Visits each listing has sent its site (28d) — social proof on the cards.
    getOutboundClicks(),
  ]);

  return (
    <>
      {/* Board header — SEO h1 + the pitch on the left, a "how ranking works"
          explainer card on the right. Two columns on desktop, stacked on mobile. */}
      <section className="hero-glow border-b border-border/60">
        <div className="container grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          {/* Left — the pitch */}
          <div className="flex flex-col items-start gap-5">
            {/* Live activity pill — real first-party numbers, makes the board feel active. */}
            <div className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm">
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

            <h1 className="max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              The leaderboard for sites that actually get traffic.
            </h1>
            <p className="max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              <ShieldCheck
                className="mr-1.5 inline-block size-4 align-[-0.2em] text-primary"
                aria-hidden="true"
              />
              Ranked by opted-in Google Search Console clicks — momentum, not votes or estimates.
            </p>

            {/* Two paths, equal weight: list free today, or earn a verified rank. */}
            <div className="flex w-full flex-col items-start gap-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/submit">
                    <Plus className="size-4" /> List your project — free
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">
                    <ShieldCheck className="size-4" /> Get a verified rank
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Listing is free and permanent · a verified rank is free too — connect Search Console (read-only)
              </p>
            </div>
          </div>

          {/* Right — how ranking works */}
          <HowItWorksCard />
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

      {/* Spotlight — earned (this week's fastest-growing verified site) beside
          paid (labelled, owner-verified listings). Never part of the ranking above. */}
      {listed.length > 0 && (
        <section className="border-t border-border/60">
          <div className="container py-10">
            <SpotlightLane
              spotlights={activeSpotlights(listed)}
              mover={data.organic.find((s) => !s.pending) ?? null}
              visits={outboundClicks}
              slotsLeft={spotlightAvailability(listed).slotsLeft}
            />
          </div>
        </section>
      )}

      {/* Board 2 — the open directory of freshly listed projects. Visually
          separated and unranked so it never reads as a verified ranking. */}
      <JustListed
        listings={listed.slice(0, HOMEPAGE_LISTED_LIMIT)}
        total={listed.length}
        visits={outboundClicks}
      />

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

/**
 * The three-step "how ranking works" explainer, shown beside the hero. Reinforces
 * the thesis right where a first-time visitor lands: read-only data in, momentum
 * scoring, daily updates, and — the whole point — no votes and no pay-to-rank.
 */
const RANK_STEPS = [
  {
    title: "Connect Search Console",
    body: "Read-only. We only see click counts — never your queries or revenue.",
  },
  {
    title: "We score momentum",
    body: "Your last 7 days of clicks vs. the prior 21. Small sites can outrank big ones.",
  },
  {
    title: "The board updates daily",
    body: "No votes, no pay-to-rank. Real growth decides the order.",
  },
] as const;

function HowItWorksCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border/70 px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        How ranking works
      </div>
      <ol className="divide-y divide-border/60">
        {RANK_STEPS.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 p-5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-semibold text-primary">
              {i + 1}
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-semibold">{step.title}</span>
              <span className="text-sm leading-relaxed text-muted-foreground">{step.body}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
