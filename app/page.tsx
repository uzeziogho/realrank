import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaderboardSection } from "@/components/leaderboard-section";
import { JustListed } from "@/components/just-listed";
import { SpotlightLane } from "@/components/spotlight-lane";
import { activeSpotlights, spotlightAvailability } from "@/lib/spotlight";
import { getLeaderboardData, getOutboundClicks } from "@/lib/data";
import { siteSlug } from "@/lib/site";
import { getListedSites } from "@/lib/listed";
import { BadgeMarquee } from "@/components/badge-marquee";
import { siteConfig } from "@/lib/config";
import { cn, formatCompact, formatGrowth, timeAgo } from "@/lib/utils";

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
  const [data, listed, outboundClicks] = await Promise.all([
    getLeaderboardData("momentum"),
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
            {/* One short line that never wraps: the scarcity hook (founding spots
                left), or — once the program is full — that the board is live. */}
            <Link
              href={data.founding.spotsLeft > 0 ? "/founding" : "/leaderboard"}
              className="inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-primary/40"
              title={`The first ${data.founding.total} verified sites get a permanent Founder badge`}
            >
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              {data.founding.spotsLeft > 0 ? (
                <span className="truncate">
                  <span className="font-semibold tabular-nums">{data.founding.spotsLeft}</span> of {data.founding.total} founding
                  spots left
                </span>
              ) : (
                <span className="truncate">Live board · updated {data.lastUpdated ? timeAgo(data.lastUpdated) : "daily"}</span>
              )}
              <span className="shrink-0 font-medium text-primary">→</span>
            </Link>

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

            {/* Proof the board is real and worth joining — the numbers a visitor
                (and a maker deciding whether to list) actually cares about. */}
            <HeroStats
              stats={heroStats(data, listed.length, outboundClicks)}
              updated={data.lastUpdated}
            />
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

interface HeroStat {
  value: string;
  label: string;
  href: string;
  /** Colour the value as growth. */
  growth?: boolean;
}

/**
 * The four hero numbers, best first: how big the verified board is, who's
 * winning this week, what listing has done for makers, and how big the
 * directory is. A number that would read as weak (no mover yet, a handful of
 * visits, an empty directory) is left out rather than shown. (Founding spots
 * live in the pill above, so they're not repeated here.)
 */
function heroStats(
  data: Awaited<ReturnType<typeof getLeaderboardData>>,
  listedCount: number,
  visits: Map<string, number>,
): HeroStat[] {
  const ranked = data.organic.filter((s) => !s.pending);
  const mover = ranked.reduce<(typeof ranked)[number] | null>((best, s) => (!best || s.growthRate > best.growthRate ? s : best), null);
  const sent = [...visits.values()].reduce((a, b) => a + b, 0);
  const out: HeroStat[] = [{ value: formatCompact(ranked.length), label: "verified sites ranked", href: "/leaderboard" }];
  if (mover && mover.growthRate > 0) {
    out.push({ value: formatGrowth(mover.growthRate), label: `${mover.displayName} · top mover this week`, href: `/site/${siteSlug(mover.siteUrl)}`, growth: true });
  }
  if (sent >= 100) out.push({ value: formatCompact(sent), label: "visits sent to listed projects", href: "/listed" });
  if (listedCount > 0) out.push({ value: formatCompact(listedCount), label: "projects in the directory", href: "/listed" });
  return out.slice(0, 4);
}

function HeroStats({ stats, updated }: { stats: HeroStat[]; updated: string | null }) {
  return (
    <div className="w-full max-w-2xl">
      <ul className={cn("grid grid-cols-2 gap-2", stats.length >= 4 ? "sm:grid-cols-4" : stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {stats.map((s) => (
          <li key={s.label} className="min-w-0">
            <Link
              href={s.href}
              className="flex h-full flex-col rounded-xl border border-border bg-card/80 px-3 py-2.5 transition-colors hover:border-primary/40"
            >
              <span className={cn("text-xl font-bold tabular-nums tracking-tight", s.growth && "text-success")}>{s.value}</span>
              <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Live from verified Search Console data · updated {updated ? timeAgo(updated) : "daily"} ·{" "}
        <Link href="/stats" className="font-medium text-primary hover:underline">
          more stats
        </Link>
      </p>
    </div>
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
    // Desktop only: on a phone it pushes the board below the fold, and the board
    // carries its own "How does ranking work?" explainer.
    <div className="hidden overflow-hidden rounded-2xl border border-border bg-card lg:block">
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
