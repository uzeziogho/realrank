import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  LockKeyhole,
  LineChart,
  BarChart3,
  Award,
  GitCompare,
  Radio,
  Search,
  Bot,
} from "lucide-react";
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

      {/* Full feature set — the detail that used to crowd the homepage. */}
      <div className="mt-16">
        <h2 className="text-2xl font-semibold tracking-tight">Everything {siteConfig.name} does</h2>
        <p className="mt-2 text-muted-foreground">
          A verified leaderboard, plus the tools to prove and grow your traffic. Free
          while it&apos;s new.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <p className="mt-3 font-medium">{f.title}</p>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{f.body}</p>
              <span className="mt-3 text-sm font-medium text-primary group-hover:underline">
                {f.cta} →
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <p className="text-muted-foreground">Ready to see where you rank?</p>
        <Button asChild size="lg">
          <Link href="/dashboard">Add my site</Link>
        </Button>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Momentum ranking",
    body: "Ranked by growth velocity, last 7 days vs. the prior 21, so fast-rising sites beat flat giants.",
    href: "/leaderboard",
    cta: "See the board",
  },
  {
    icon: ShieldCheck,
    title: "Verified, not estimated",
    body: "Real organic clicks pulled from your Google Search Console (read-only). No guesses, no self-reported numbers.",
    href: "/blog/verified-vs-estimated-traffic",
    cta: "Why it matters",
  },
  {
    icon: Bot,
    title: "Agent visibility",
    body: "Your verified momentum is queryable by AI assistants via MCP, so agents surface you to buyers.",
    href: "/agent-visibility",
    cta: "How agents see you",
  },
  {
    icon: Search,
    title: "Search-leak finder",
    body: "See the searches where you rank but miss the click, plus near-page-1 queries worth chasing.",
    href: "/dashboard/leaks",
    cta: "Find your leaks",
  },
  {
    icon: LineChart,
    title: "Momentum timeline",
    body: "Every site gets a daily-clicks trend and row sparklines, so you can see who's heating up at a glance.",
    href: "/blog/read-search-console-momentum",
    cta: "Read your trend",
  },
  {
    icon: Award,
    title: "Profiles, rank cards & badges",
    body: "A shareable profile per site, dynamic rank cards for social, and an embeddable badge that updates itself.",
    href: "/blog/rank-badge-social-proof",
    cta: "Turn rank into proof",
  },
  {
    icon: GitCompare,
    title: "Head-to-head compare",
    body: "Put any two sites side by side: momentum, volume, growth and authority, with the leader highlighted.",
    href: "/leaderboard",
    cta: "Browse the board",
  },
  {
    icon: Radio,
    title: "Channels attribution",
    body: "See which marketing channels actually bring paying customers, ranked by revenue.",
    href: "/dashboard/channels",
    cta: "Open Channels",
  },
  {
    icon: BarChart3,
    title: "Domain authority (DR)",
    body: "A DR-style authority score shown alongside verified traffic. Context, never a way to game the rank.",
    href: "/underdogs",
    cta: "See the underdogs",
  },
  {
    icon: RefreshCw,
    title: "Always fresh",
    body: "Numbers refresh automatically from Search Console, and new sites appear the moment they connect.",
    href: "/launches",
    cta: "See launches",
  },
] as const;
