import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Award, Search, Bot } from "lucide-react";
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
            Anyone can ship a site now. RealRank shows which ones get traffic.
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            The public leaderboard of <strong className="text-foreground">verified</strong> organic
            traffic — real Google Search Console clicks, ranked by momentum so fast-growing sites
            beat the giants. Proof, not screenshots — and the tools to find where you&apos;re
            leaking clicks and win them back.
          </p>

          {/* Positioning — verified proof is the wedge now, not the anti-bid angle. */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <ShieldCheck className="size-4" />
            Verified by Google Search Console — real clicks, not vibes.
          </div>

          {/* Personalized entry point — check your domain, then connect. */}
          <div className="mt-8 flex w-full flex-col items-center">
            <RankChecker knownHosts={knownHosts} topClicks={topClicks} totalSites={data.totalSites} />
            <p className="mt-3 text-sm text-muted-foreground">
              or{" "}
              <Link href="/login" className="text-primary hover:underline">connect Google Search Console</Link>
              {" · "}
              <Link href="/launches" className="hover:text-foreground">see what&apos;s launching</Link>
              {" · "}
              <Link href="#leaderboard" className="hover:text-foreground">view the leaderboard</Link>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Read-only access · free · about 30 seconds
            </p>
          </div>

          {/* What you get when you connect — the sign-up drivers, front and centre. */}
          <div className="mt-12 grid w-full max-w-4xl gap-4 text-left sm:grid-cols-3">
            <HeroFeature
              icon={<Search className="size-5" />}
              title="Find the clicks you're losing"
              body="The exact searches where you rank but miss the click — and how to win them back."
            />
            <HeroFeature
              icon={<ShieldCheck className="size-5" />}
              title="Proof you can show"
              body="An un-fakeable public rank and an embeddable badge, straight from Search Console."
            />
            <HeroFeature
              icon={<Bot className="size-5" />}
              title="Get cited by AI agents"
              body="Your verified momentum is queryable over MCP, so assistants surface you to buyers."
            />
          </div>

        </div>
      </section>

      {/* Movers & Shakers — this week's climbers, above the board for pull */}
      {(movers.climbers.length > 0 || movers.newcomers.length > 0) && (
        <section className="container -mt-8 sm:-mt-10">
          <div className="mx-auto max-w-3xl">
            <MoversBand
              climbers={movers.climbers}
              newcomers={movers.newcomers}
              compact
            />
          </div>
        </section>
      )}

      {/* Leaderboard preview: default momentum view, static.
          Search, the volume toggle, and pagination live on /leaderboard. */}
      <LeaderboardSection
        data={data}
        view="momentum"
        query=""
        page={1}
        interactive={false}
      />

      {/* More than a leaderboard — the full feature detail lives on /about now. */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="container flex flex-col items-center gap-4 py-14 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">More than a leaderboard</h2>
          <p className="max-w-xl text-balance text-muted-foreground">
            A search-leak finder, shareable rank badges, head-to-head compare, channel
            attribution, and agent visibility. All free while it&apos;s new.
          </p>
          <Link
            href="/about"
            className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium transition-colors hover:bg-accent"
          >
            See everything RealRank does →
          </Link>
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

function HeroFeature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-3 font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

