import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Prose } from "@/components/prose";
import { getLeaderboardData } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { formatCompact, formatGrowth, hostname, siteHref } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The best .lol directories & leaderboards (2026)",
  description:
    "A guide to the .lol directory wave — outbid.lol's pay-to-rank board, TrustMRR's verified revenue, and RealRank's verified organic traffic. What each ranks, and which to trust.",
  alternates: { canonical: "/best/lol-directories" },
  keywords: [".lol directories", "outbid.lol", "trustmrr", "pay to rank", "verified leaderboard", "indie hackers"],
};

const FAQ = [
  {
    q: "What is a .lol directory?",
    a: "A wave of single-purpose ranking sites on the .lol domain that blew up in 2026 — public leaderboards of startups and websites. Some rank by who pays the most (pay-to-rank), others by verified data like revenue or organic traffic.",
  },
  {
    q: "What started the .lol craze?",
    a: "Jonathan Wilke's outbid.lol — a pay-to-rank board where you pay $1 more than the current leader to take the top spot. It reportedly made around $178K in its first 77 hours and spawned 170+ clones.",
  },
  {
    q: "What's the difference between pay-to-rank and verified leaderboards?",
    a: "Pay-to-rank ranks by spend — the top spot goes to the highest bidder. Verified leaderboards rank by data the platform can prove: TrustMRR verifies revenue via Stripe; RealRank verifies organic traffic via Google Search Console.",
  },
  {
    q: "How does RealRank verify traffic?",
    a: "Site owners connect Google Search Console (read-only). RealRank reads the real organic click totals for the last 7 and 28 days straight from Google and ranks sites by momentum (growth velocity) or volume — no self-reported numbers.",
  },
];

export default async function LolDirectoriesPage() {
  const data = await getLeaderboardData("momentum");
  // Only ranked sites here — pending (no-traffic) rows have no rank or growth.
  const ranked = data.organic.filter((s) => !s.pending);
  const leaders = ranked.slice(0, 5);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="container max-w-3xl py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <h1 className="text-balance text-4xl font-bold tracking-tight">
        The best .lol directories & leaderboards (2026)
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        In 2026 the .lol domain became the home of a new kind of website: the
        public leaderboard. Here&apos;s what actually launched, what each one
        ranks, and which are built to last.
      </p>

      <Prose className="mt-8">
        <h2>outbid.lol — the pay-to-rank board that started it</h2>
        <p>
          Built by German indie hacker Jonathan Wilke in about three hours,{" "}
          <a href="https://outbid.lol/" target="_blank" rel="noopener noreferrer">outbid.lol</a>{" "}
          runs on one rule: pay a dollar more than the current leader to take #1.
          It reportedly earned around <strong>$178,000 in 77 hours</strong> and
          triggered a wave of 170+ copycats. Brilliant as a monetization gag —
          but the ranking only measures who spent the most.
        </p>

        <h2>TrustMRR — verified revenue</h2>
        <p>
          Marc Lou&apos;s{" "}
          <a href="https://trustmrr.com/" target="_blank" rel="noopener noreferrer">TrustMRR</a>{" "}
          took the opposite path: rank startups by <strong>Stripe-verified
          revenue</strong>, so no one can fake a number. It even has a{" "}
          <a href="https://trustmrr.com/special-category/lol" target="_blank" rel="noopener noreferrer">.lol category</a>{" "}
          of its own. The takeaway that reshaped the trend: a ranking is only
          worth browsing if the data behind it is real.
        </p>

        <h2>RealRank — verified organic traffic</h2>
        <p>
          <Link href="/">RealRank</Link> applies verification to the metric every
          founder cares about most: <strong>organic search traffic</strong>.
          Sites connect Google Search Console (read-only) and are ranked by{" "}
          <Link href="/about">momentum</Link> — growth velocity — so a
          fast-rising newcomer can beat a flat incumbent. Nothing is
          self-reported; the clicks come straight from Google.
        </p>
      </Prose>

      {/* Live proof */}
      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">RealRank momentum leaders right now</h2>
        <ol className="mt-4 divide-y divide-border">
          {leaders.map((s) => (
            <li key={s.id} className="flex items-center gap-4 py-3">
              <span className="w-5 text-sm font-semibold tabular-nums text-muted-foreground">{s.rank}</span>
              <Link href={`/site/${hostname(s.siteUrl).toLowerCase()}`} className="flex-1 truncate font-medium hover:underline">
                {s.displayName}
              </Link>
              <span className="text-sm text-success">{formatGrowth(s.growthRate)}</span>
              <a href={siteHref(s.siteUrl)} target="_blank" rel="noopener nofollow" className="text-muted-foreground">
                <ArrowUpRight className="size-3.5" />
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          {formatCompact(ranked.length)} sites ranked · updated hourly.{" "}
          <Link href="/" className="text-primary hover:underline">See the full board →</Link>
        </p>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
        <dl className="mt-4 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-medium text-foreground">{f.q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-12 text-center">
        <Button asChild size="lg">
          <Link href="/login">Claim your verified rank</Link>
        </Button>
      </div>
    </div>
  );
}
