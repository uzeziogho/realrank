import type { Metadata } from "next";
import Link from "next/link";
import { RefreshCw, ShieldCheck, TrendingUp, LineChart, BarChart3, Award, GitCompare, Radio, Search, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FaqJsonLd } from "@/components/json-ld";
import { LeaderboardSection } from "@/components/leaderboard-section";
import { getLeaderboardData, getRecentlyJoined, getMovers, getSiteTraffic } from "@/lib/data";
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
  // Fetch concurrently — the board/recent/movers share one cached Supabase read
  // (see loadRaw), so this is ~2 round-trips instead of the previous 7 in series.
  const [data, recent, movers, traffic] = await Promise.all([
    getLeaderboardData("momentum"),
    getRecentlyJoined(6),
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
              <Link href="#leaderboard" className="hover:text-foreground">view the leaderboard</Link>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Read-only access · free · about 30 seconds
            </p>
          </div>

          {/* Liveness — recently joined sites */}
          {recent.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Recently joined</span>
              {recent.map((s) => (
                <Link
                  key={s.host}
                  href={`/site/${s.host}`}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s.displayName}
                </Link>
              ))}
            </div>
          )}
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

      {/* Features — surface everything RealRank does */}
      <section className="border-t border-border/60 bg-card/40">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything RealRank does
            </h2>
            <p className="mt-2 text-muted-foreground">
              A verified leaderboard, plus the tools to prove and grow your traffic —
              all free while it&apos;s new.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<TrendingUp className="size-5" />}
              title="Momentum ranking"
              body="Ranked by growth velocity — last 7 days vs. the prior 21 — so fast-rising sites beat flat giants."
              href="/about"
              cta="How it works"
            />
            <FeatureCard
              icon={<ShieldCheck className="size-5" />}
              title="Verified, not estimated"
              body="Real organic clicks pulled from your Google Search Console (read-only). No guesses, no self-reported numbers."
              href="/blog/verified-vs-estimated-traffic"
              cta="Why it matters"
            />
            <FeatureCard
              icon={<Bot className="size-5" />}
              title="Agent visibility"
              body="Your verified momentum is queryable by AI assistants via MCP — the longer you're verified, the stronger your signal when an agent compares you to rivals."
              href="/agent-visibility"
              cta="How agents see you"
            />
            <FeatureCard
              icon={<Search className="size-5" />}
              title="Search-leak finder"
              body="See the searches where you rank but don't get the click, plus the near-page-1 queries worth chasing — recover traffic you've already earned."
              href="/dashboard/leaks"
              cta="Find your leaks"
            />
            <FeatureCard
              icon={<LineChart className="size-5" />}
              title="Momentum timeline"
              body="Every site gets a daily-clicks trend and row sparklines, so you can see who's heating up at a glance."
              href="/blog/read-search-console-momentum"
              cta="Read your trend"
            />
            <FeatureCard
              icon={<Award className="size-5" />}
              title="Profiles, rank cards & badges"
              body="A shareable profile per site, dynamic rank cards for social, and an embeddable badge that updates itself."
              href="/blog/rank-badge-social-proof"
              cta="Turn rank into proof"
            />
            <FeatureCard
              icon={<GitCompare className="size-5" />}
              title="Head-to-head compare"
              body="Put any two sites side by side — momentum, volume, growth and authority, with the leader highlighted."
              href="/#leaderboard"
              cta="Browse the board"
            />
            <FeatureCard
              icon={<Radio className="size-5" />}
              title="Channels — attribution"
              body="See which marketing channels actually bring paying customers — ranked by revenue, so you spend where it pays."
              href="/dashboard/channels"
              cta="Open Channels"
            />
            <FeatureCard
              icon={<BarChart3 className="size-5" />}
              title="Domain authority (DR)"
              body="A DR-style authority score shown alongside verified traffic — context, never a way to game the rank."
              href="/best/lol-directories"
              cta="See the board"
            />
            <FeatureCard
              icon={<RefreshCw className="size-5" />}
              title="Always fresh"
              body="Numbers refresh automatically from Search Console, and new sites appear the moment they connect."
              href="/login"
              cta="Connect & claim"
            />
            <FeatureCard
              icon={<ShieldCheck className="size-5" />}
              title="Free to claim"
              body="Connect Search Console, publish your verified properties, and let real growth decide your order."
              href="/login"
              cta="Get on the board"
            />
          </div>
        </div>
      </section>

      {/* Explore — internal links to landing pages + blog */}
      <section className="border-t border-border/60">
        <div className="container py-14">
          <h2 className="text-xl font-semibold tracking-tight">Explore</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Guides and rankings on verified organic traffic and the .lol
            leaderboard wave.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ExploreCard
              href="/best/fastest-growing-saas-websites"
              title="Fastest-growing SaaS websites"
              body="A live ranking of SaaS sites by verified organic momentum — not third-party estimates."
            />
            <ExploreCard
              href="/best/lol-directories"
              title="The best .lol directories"
              body="outbid.lol, TrustMRR, and RealRank compared — what each ranks, and which to trust."
            />
            <ExploreCard
              href="/blog/grow-saas-organic-traffic"
              title="How to grow organic traffic"
              body="A founder's playbook for the compounding channel that keeps paying after you stop."
            />
            <ExploreCard
              href="/blog/verified-vs-estimated-traffic"
              title="Verified vs estimated traffic"
              body="Why SimilarWeb and Search Console disagree — and which number you can actually trust."
            />
            <ExploreCard
              href="/blog/momentum-score-explained"
              title="What's a good momentum score?"
              body="How to read your ranking, why it moves week to week, and the honest ways to climb."
            />
            <ExploreCard
              href="/blog"
              title="All articles →"
              body="Essays on verified traffic, the pay-to-rank craze, and what really moves rankings."
            />
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
          <Button asChild size="lg" className="mt-2">
            <Link href="/login">Show me my leaks</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Read-only access · free · about 30 seconds
          </p>

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

function FeatureCard({
  icon,
  title,
  body,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border border-border bg-background p-5 transition-colors hover:border-primary/50"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{body}</p>
      <span className="mt-3 text-sm font-medium text-primary group-hover:underline">{cta} →</span>
    </Link>
  );
}

function ExploreCard({
  href,
  title,
  body,
}: {
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
    >
      <p className="font-medium group-hover:text-primary">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </Link>
  );
}
