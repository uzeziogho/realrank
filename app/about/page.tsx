import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, TrendingUp, RefreshCw, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "How it works",
  description: `How ${siteConfig.name} verifies organic traffic and ranks sites by momentum using read-only Google Search Console data.`,
  alternates: { canonical: "/about" },
};

const steps = [
  {
    icon: ShieldCheck,
    title: "Connect Search Console",
    body: "Sign in with Google and grant read-only access to your verified properties. We only request webmasters.readonly — we can never change your site or ads.",
  },
  {
    icon: TrendingUp,
    title: "We verify the clicks",
    body: "We pull your real organic clicks for the last 7 and 28 days directly from Google. No self-reported numbers, no estimates.",
  },
  {
    icon: RefreshCw,
    title: "Momentum decides the order",
    body: "Your last 7 days are compared to the prior 21 to measure growth velocity, weighted by volume. Fast-growing sites can out-rank far bigger ones.",
  },
  {
    icon: LockKeyhole,
    title: "You stay in control",
    body: "Choose exactly which properties are public, toggle them off anytime, and your access token is encrypted at rest and never exposed to the browser.",
  },
];

export default function AboutPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="text-4xl font-bold tracking-tight">How {siteConfig.name} works</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        A public leaderboard where real organic growth — not marketing budgets —
        decides who ranks first.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {steps.map((s) => (
          <div key={s.title} className="rounded-xl border border-border bg-card p-6">
            <s.icon className="size-6 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">{s.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-border bg-card p-8">
        <h2 className="text-xl font-semibold">The Momentum Score, precisely</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          We compute your average daily clicks over the last 7 days and compare it
          to your average daily clicks across the prior 21 days. That growth rate is
          multiplied by a logarithmic volume weight, so both{" "}
          <em>how fast you&apos;re growing</em> and <em>how much traffic you have</em>{" "}
          matter. Switch to the <strong>Volume</strong> view any time to rank purely
          by total 28-day clicks.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs text-muted-foreground">
{`recent   = clicks_7d / 7
prior    = (clicks_28d − clicks_7d) / 21
growth   = (recent − prior) / prior
momentum = (1 + growth) × log10(clicks_7d + 1) × 100`}
        </pre>
      </div>

      <div className="mt-12 flex flex-col items-center gap-3 text-center">
        <p className="text-muted-foreground">Ready to see where you rank?</p>
        <Button asChild size="lg">
          <Link href="/dashboard">Add your site</Link>
        </Button>
      </div>
    </div>
  );
}
