import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Prose } from "@/components/prose";
import { getLeaderboardData } from "@/lib/data";
import { getListedSites } from "@/lib/listed";
import { formatCompact, formatGrowth, hostname, siteHref } from "@/lib/utils";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Where to launch your startup in 2026 (the directories that matter)",
  description:
    "A practical, no-fluff list of where to launch a SaaS or indie startup in 2026 — the launch feeds, the curated directories, the dofollow backlink sites — and how to turn the launch into proof your product gets real traffic.",
  alternates: { canonical: "/best/where-to-launch-your-startup" },
  keywords: [
    "where to launch your startup",
    "where to launch a saas",
    "startup launch sites 2026",
    "best places to launch",
    "indie hacker launch directories",
  ],
};

const FAQ = [
  {
    q: "Where should I launch my startup first?",
    a: "Launch where the format fits: a launch feed (DevHunt, Startup Fame) for a dated spike, a curated directory (Findly.tools, Founder.best) for permanent discovery, and a verified board (RealRank) to prove the traffic is real. Most makers do all three over a week rather than betting on one.",
  },
  {
    q: "How many directories should I submit to?",
    a: "As many relevant ones as you can — the value is cumulative. Each is a backlink and a small stream of qualified visitors. Prepare your name, tagline, description, logo and screenshots once, then work through the list. Stagger the badges you add over a few days so the link profile looks organic.",
  },
  {
    q: "Do launch directories actually help SEO?",
    a: "The durable value is the backlinks. One link is noise; thirty relevant links from launch and maker sites is a real compounding signal. The referral traffic is a bonus — small per site, but qualified, and a couple will surprise you.",
  },
  {
    q: "What does RealRank add that a normal directory doesn't?",
    a: "Proof. Any directory will list you the moment you submit — that only proves you filled a form. RealRank reads your verified Google Search Console clicks and ranks you on them, so your listing answers the question everyone actually asks: does it get traffic?",
  },
];

export default async function WhereToLaunchPage() {
  const [data, listed] = await Promise.all([
    getLeaderboardData("momentum"),
    getListedSites().catch(() => []),
  ]);
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
        Where to launch your startup in 2026
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Launching isn&apos;t one big day on one big site anymore. It&apos;s a sweep across a
        long tail of directories, each worth a backlink, a trickle of qualified traffic, and
        a badge. Here&apos;s the shortlist that matters, sorted by what each one is for.
      </p>

      <Prose className="mt-8">
        <h2>1. Launch feeds — for a dated spike</h2>
        <p>
          Post, appear in a dated feed, maybe collect upvotes or a weekly ranking.{" "}
          <a href="https://devhunt.org" target="_blank" rel="noopener noreferrer">DevHunt</a>,{" "}
          <a href="https://startupfa.me" target="_blank" rel="noopener noreferrer">Startup Fame</a>,{" "}
          <a href="https://twelve.tools" target="_blank" rel="noopener noreferrer">Twelve Tools</a>,{" "}
          <a href="https://www.superlaun.ch" target="_blank" rel="noopener noreferrer">Super Launch</a>,{" "}
          <a href="https://launchigniter.com" target="_blank" rel="noopener noreferrer">LaunchIgniter</a>,{" "}
          <a href="https://noonlaunch.com" target="_blank" rel="noopener noreferrer">Noonlaunch</a>,{" "}
          <a href="https://nicklaunches.com" target="_blank" rel="noopener noreferrer">Nick Launches</a> and{" "}
          <a href="https://letslaunch.today" target="_blank" rel="noopener noreferrer">LetsLaunch</a>.
        </p>

        <h2>2. Curated directories — for permanent discovery</h2>
        <p>
          Submit once, stay findable by category.{" "}
          <a href="https://findly.tools" target="_blank" rel="noopener noreferrer">Findly.tools</a>,{" "}
          <a href="https://www.founder.best" target="_blank" rel="noopener noreferrer">Founder.best</a>,{" "}
          <a href="https://www.tinyshelf.co" target="_blank" rel="noopener noreferrer">tinyshelf</a>,{" "}
          <a href="https://www.foundrlist.com" target="_blank" rel="noopener noreferrer">FoundrList</a>,{" "}
          <a href="https://spacerrapps.com" target="_blank" rel="noopener noreferrer">SpacerrApps</a> and{" "}
          <a href="https://confettisaas.com" target="_blank" rel="noopener noreferrer">ConfettiSaaS</a>.
        </p>

        <h2>3. Dofollow backlink sites — for SEO</h2>
        <p>
          These lean into the link value: add their badge, get a followed link back.{" "}
          <a href="https://dang.ai" target="_blank" rel="noopener noreferrer">DANG!</a> and{" "}
          <a href="https://easydofollow.dev" target="_blank" rel="noopener noreferrer">EasyDoFollow</a>{" "}
          are the clearest examples. Fair trade, lasting value.
        </p>

        <h2>4. RealRank — for the proof</h2>
        <p>
          Do the sweep, then come here to turn &quot;we launched&quot; into &quot;here&apos;s
          the proof.&quot; <Link href="/submit">List free</Link> for a permanent link and a
          badge, then <Link href="/login">connect Google Search Console</Link> (read-only) to
          be ranked by your <strong>verified</strong> organic clicks. The board rewards{" "}
          <Link href="/momentum-score">momentum</Link>, so being new and growing fast beats
          being big and flat. A deeper walk-through is in{" "}
          <Link href="/blog/where-to-launch-your-project-launch-directories">
            our launch-directories guide
          </Link>
          .
        </p>
      </Prose>

      {/* Live proof */}
      {leaders.length > 0 && (
        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Launched here and climbing</h2>
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
            {formatCompact(ranked.length)} verified{" "}
            {ranked.length === 1 ? "site" : "sites"} ranked
            {listed.length > 0 && ` · ${formatCompact(listed.length)} more in the free directory`}
            . <Link href="/launches" className="text-primary hover:underline">See this week&apos;s launches →</Link>
          </p>
        </section>
      )}

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

      <div className="mt-12 flex flex-col items-center gap-2 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="lg">
            <Link href="/submit">List your project — free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Connect Search Console for a verified rank</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Free · permanent link · no pay-to-rank</p>
      </div>
    </div>
  );
}
