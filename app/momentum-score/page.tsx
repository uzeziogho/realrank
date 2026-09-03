import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, ShieldCheck, TrendingUp } from "lucide-react";
import { MomentumCalculator } from "@/components/momentum-calculator";
import { siteConfig } from "@/lib/config";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Momentum Score Calculator — Grade Your Organic Growth",
  description:
    "Free momentum score calculator. Enter your Google Search Console clicks (7-day and 28-day) to see your organic growth score — the same formula RealRank uses to rank the fastest-growing websites. No login required.",
  alternates: { canonical: "/momentum-score" },
  openGraph: {
    title: "Momentum Score Calculator — Grade Your Organic Growth",
    description:
      "Enter your Search Console clicks and see your organic momentum score in seconds. Free, no login.",
    url: `${siteConfig.url}/momentum-score`,
  },
};

export default function MomentumScorePage() {
  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-14 text-center sm:py-20">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground">
            <Calculator className="size-4 text-primary" /> Free · no login
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Momentum score calculator
          </h1>
          <p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
            How fast is your organic traffic really growing? Enter your Search
            Console clicks and get your momentum score — the same formula the{" "}
            <Link href="/#leaderboard" className="text-primary hover:underline">
              RealRank board
            </Link>{" "}
            uses to rank fast-growing sites above the giants.
          </p>
        </div>
      </section>

      <div className="container max-w-2xl py-12">
        <MomentumCalculator />

        {/* Explainer — SEO body */}
        <div className="mt-14 space-y-10">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">
              What is a momentum score?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Momentum measures how fast your organic traffic is <em>accelerating</em>,
              not just how big it is. It compares your last 7 days of Google Search
              Console clicks against the prior 21 days — as daily rates, so the windows
              are fair — then weights the result by volume on a logarithmic scale. A
              small site doubling its traffic can out-score a giant that&apos;s flat,
              while random noise from a tiny site can&apos;t leapfrog a steady performer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">How it&apos;s calculated</h2>
            <ol className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">1. Daily rates.</strong> Recent =
                7-day clicks ÷ 7. Prior = (28-day − 7-day) clicks ÷ 21.
              </li>
              <li>
                <strong className="text-foreground">2. Growth.</strong> How much the
                recent daily rate beats the prior one (a new site with no prior traffic
                counts as +100%).
              </li>
              <li>
                <strong className="text-foreground">3. Volume weight.</strong> Multiply
                by log₁₀(recent clicks) so bigger sites still get credit — but can&apos;t
                sit at #1 on size alone while shrinking.
              </li>
            </ol>
            <p className="mt-3 text-sm text-muted-foreground">
              Want the full breakdown?{" "}
              <Link href="/blog/momentum-score-explained" className="text-primary hover:underline">
                Read what makes a good momentum score →
              </Link>
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <ShieldCheck className="size-5 text-primary" />
              Estimated vs verified
            </h2>
            <p className="mt-2 text-muted-foreground">
              This calculator uses numbers <em>you</em> type in — useful for a gut check,
              but anyone can inflate it. On the RealRank leaderboard, your score is
              computed from clicks pulled directly from your Google Search Console
              (read-only) — so it&apos;s a number you can actually prove.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <TrendingUp className="size-4" /> Get your verified rank
              </Link>
              <Link
                href="/founding"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Claim a founding spot
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
