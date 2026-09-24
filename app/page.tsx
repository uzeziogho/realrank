import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Award } from "lucide-react";
import { ConnectCTA } from "@/components/connect-cta";
import { FaqJsonLd } from "@/components/json-ld";
import { LeaderboardSection } from "@/components/leaderboard-section";
import { getLeaderboardData, getMovers, getSiteTraffic } from "@/lib/data";
import { MoversBand } from "@/components/movers";
import { RankChecker } from "@/components/rank-checker";
import { WaitlistForm } from "@/components/waitlist-form";
import { BadgeMarquee } from "@/components/badge-marquee";
import { siteConfig } from "@/lib/config";
import { formatCompact, hostname } from "@/lib/utils";

// Incremental Static Regeneration — full ranked list is in the initial HTML,
// refreshed at most hourly (and on-demand after the cron writes new data).
export const revalidate = 3600;

/** Homepage FAQ: rendered visibly and mirrored into FAQPage structured data. */
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "What is RealRank?",
    a: "RealRank is a public leaderboard of websites ranked by verified organic search traffic. Sites connect Google Search Console (read-only) and their real click totals decide the order, so the ranking cannot be faked with screenshots or third-party estimates.",
  },
  {
    q: "How does the ranking work?",
    a: "The default sort is momentum, which compares a site's last 7 days of organic clicks against the prior 21 days, weighted by a logarithm of volume so a fast-growing small site can outrank a large flat one. A volume view (total clicks over 28 days) is also available. Rankings refresh hourly.",
  },
  {
    q: "Is RealRank free?",
    a: "Yes. Connecting a site and claiming a verified rank is free. The public leaderboard and the tools around it (report card, momentum calculator, traffic reality check) are free to use with no login required to browse.",
  },
  {
    q: "Is it safe to connect Google Search Console?",
    a: "RealRank requests a single read-only scope (webmasters.readonly). It can read search-performance data for properties you already own, but it cannot change settings, submit or remove URLs, or write anything. Nothing is public until you choose to publish a property, and you can revoke access anytime from your Google account permissions.",
  },
  {
    q: "Can I fake my traffic to rank higher?",
    a: "No. Click totals are read straight from Google Search Console, so the only way to climb is real organic growth. Nobody types in a number and nobody uploads a screenshot.",
  },
];

export const metadata: Metadata = {
  title: "Fastest-Growing Websites by Organic Traffic",
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  // No searchParams here: the homepage renders the default momentum board so it
  // prerenders (ISR) and serves cached HTML. Search, the volume toggle, and
  // pagination live on /leaderboard, which is server-rendered per request.
  // Fetch concurrently — the board and movers share one cached Supabase read
  // (see loadRaw), so this is ~2 round-trips instead of running in series.
  const [data, movers, traffic] = await Promise.all([
    getLeaderboardData("momentum"),
    getMovers(5),
    getSiteTraffic(),
  ]);

  // For the rank checker: hostnames already on the board + the top volume.
  const knownHosts = data.organic.map((s) => hostname(s.siteUrl).toLowerCase());
  const topClicks = data.organic.reduce((m, s) => Math.max(m, s.clicks28d), 0);

  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-16 text-center sm:py-24">
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

          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            The growth leaderboard you can&apos;t buy your way onto.
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            Every rank is pulled from Google Search Console. No ads, no upvote rings.
            Just <strong className="text-foreground">verified</strong> clicks and momentum,
            so fast-growing sites beat the giants.
          </p>

          {/* Verified-proof positioning pill */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <ShieldCheck className="size-4" />
            Verified by Google Search Console. Real clicks, not vibes.
          </div>

          {/* One interactive entry point: where would I rank? */}
          <div className="mt-8 flex w-full flex-col items-center">
            <RankChecker knownHosts={knownHosts} topClicks={topClicks} totalSites={data.totalSites} />
            <p className="mt-3 text-xs text-muted-foreground">
              Read-only access · free · about 30 seconds
            </p>
          </div>
        </div>
      </section>

      {/* Board-as-hero: the live leaderboard is the pitch and the proof. */}
      <LeaderboardSection
        data={data}
        view="momentum"
        query=""
        page={1}
        interactive={false}
      />

      {/* Ghost row — "your spot is waiting", the honest curiosity/endowment hook. */}
      <section className="container -mt-6 pb-2">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.05] px-5 py-4 sm:flex-row">
            <div className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
                ?
              </span>
              <div>
                <p className="font-semibold">Your row is waiting.</p>
                <p className="text-sm text-muted-foreground">
                  Connect Google Search Console to reveal where you rank.
                </p>
              </div>
            </div>
            <ConnectCTA label="Reveal my rank" source="home_ghost_row" subtext={null} align="center" />
          </div>
        </div>
      </section>

      {/* This week's climbers — liveness under the board. */}
      {(movers.climbers.length > 0 || movers.newcomers.length > 0) && (
        <section className="container pb-4">
          <div className="mx-auto max-w-3xl">
            <MoversBand climbers={movers.climbers} newcomers={movers.newcomers} compact />
          </div>
        </section>
      )}

      {/* The reward — the badge as payoff and the growth loop back to RealRank. */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="container grid items-center gap-8 py-16 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-primary">The reward</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance">
              A badge that can&apos;t be faked, and a spot AI assistants can cite.
            </h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Embed your verified rank on your own site. Your momentum is queryable over
              MCP, so assistants surface you to buyers when they compare tools.
            </p>
            <Link
              href="/about"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium transition-colors hover:bg-accent"
            >
              See everything RealRank does →
            </Link>
          </div>
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-full border-2 border-primary text-sm font-bold text-primary">
                #4
              </span>
              <div>
                <div className="text-sm font-semibold">yourdomain.com</div>
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Verified by RealRank
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conversion band */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="container flex flex-col items-center gap-4 py-16 text-center">
          {data.founding.spotsLeft > 0 && (
            <Link
              href="/founding"
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
            >
              <Award className="size-4" />
              First {data.founding.total} sites are founding members — {data.founding.spotsLeft} spots left →
            </Link>
          )}
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            You&apos;re leaving verified clicks on the table.
          </h2>
          <p className="max-w-xl text-muted-foreground">
            You rank for searches you never get the click on, and your real growth
            gets lost next to sites that just buy attention. Connect Google Search
            Console and RealRank shows the exact searches you&apos;re leaking — and
            ranks you by real momentum, so growth decides your spot, not budget.
          </p>
          <ConnectCTA label="Show me my leaks" source="home_band" className="mt-2" />

          {/* Fallback for visitors not ready to connect Google yet. */}
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-border/60 pt-6">
            <p className="text-sm text-muted-foreground">Not ready to connect? Get launch updates.</p>
            <WaitlistForm source="home" />
          </div>
        </div>
      </section>

      {/* FAQ: visible answers, mirrored into FAQPage structured data below. */}
      <section className="border-t border-border/60">
        <div className="container max-w-3xl py-14">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-8 divide-y divide-border/60 rounded-2xl border border-border bg-card">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {item.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <FaqJsonLd items={FAQ_ITEMS} />

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

