import type { Metadata } from "next";
import Link from "next/link";
import { Award, TrendingUp } from "lucide-react";
import { GrowthGrader } from "@/components/growth-grader";
import { siteConfig } from "@/lib/config";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Rate My Organic Growth — Free SEO Growth Grader",
  description:
    "Get an instant A–F grade for your website's organic growth. Enter your Google Search Console clicks and see your grade — shareable, no login. Then claim your verified grade on RealRank.",
  alternates: { canonical: "/organic-growth-grade" },
  openGraph: {
    title: "Rate My Organic Growth — Free SEO Growth Grader",
    description: "Instant A–F grade for your organic traffic growth. Free, no login.",
    url: `${siteConfig.url}/organic-growth-grade`,
  },
};

export default function GrowthGradePage() {
  return (
    <>
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-14 text-center sm:py-20">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground">
            <Award className="size-4 text-primary" /> Free · no login
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Rate my organic growth
          </h1>
          <p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
            Is your traffic actually growing — or just holding? Get an instant A–F grade
            from your Search Console clicks, then share it.
          </p>
        </div>
      </section>

      <div className="container max-w-2xl py-12">
        <GrowthGrader />

        <div className="mt-14 space-y-10">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">How the grade works</h2>
            <p className="mt-3 text-muted-foreground">
              Your grade reflects <em>growth</em>, not size — how much your last 7 days of
              organic clicks beat the prior 21, measured as daily rates. A tiny site
              growing fast can score an A+ while a huge but flat site earns a D.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <li><strong className="text-foreground">A+ / A</strong> — accelerating hard (+50% or more).</li>
              <li><strong className="text-foreground">B / C</strong> — real, steady growth.</li>
              <li><strong className="text-foreground">D</strong> — flat: holding, not building.</li>
              <li><strong className="text-foreground">F</strong> — declining: momentum slipping.</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold tracking-tight">Make your grade count</h2>
            <p className="mt-2 text-muted-foreground">
              This grade is from numbers you enter. Connect Google Search Console
              (read-only) and your grade becomes <strong>verified</strong> — ranked
              publicly on the RealRank board, where no one can inflate it.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <TrendingUp className="size-4" /> Get your verified grade
              </Link>
              <Link
                href="/is-my-traffic-real"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Is my traffic real?
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
