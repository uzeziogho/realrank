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
  title: "The best Product Hunt alternatives to launch your project (2026)",
  description:
    "Product Hunt is one crowded launch day. These alternatives give you a permanent listing, a dofollow backlink, and — on RealRank — a rank decided by verified Google Search Console traffic instead of upvotes you have to campaign for.",
  alternates: { canonical: "/best/product-hunt-alternatives" },
  keywords: [
    "product hunt alternatives",
    "product hunt alternative",
    "where to launch",
    "launch directories",
    "indie launch sites",
    "free launch platform",
  ],
};

const FAQ = [
  {
    q: "What's the best Product Hunt alternative in 2026?",
    a: "It depends what you want. For a launch-day feed with upvotes, DevHunt, Startup Fame and Twelve Tools are popular. For a permanent catalog listing, Findly.tools and Founder.best work well. For a rank you can't campaign or pay your way to, RealRank ranks by verified Google Search Console clicks instead of votes.",
  },
  {
    q: "Are these alternatives free?",
    a: "Most offer a free listing, often in exchange for adding their badge to your site (a reciprocal dofollow link). Some sell a paid 'skip the queue' or 'featured' slot. RealRank is free to list and free to get a verified rank — position is never for sale.",
  },
  {
    q: "Why launch somewhere other than Product Hunt?",
    a: "Product Hunt is one high-pressure day where ranking depends on the upvotes you can rally in a few hours. Directories give you a permanent page and a backlink that keeps working for months, and a verified board like RealRank rewards real organic growth rather than launch-day hype.",
  },
  {
    q: "How does RealRank decide rank if not by upvotes?",
    a: "You connect Google Search Console (read-only). RealRank reads your real organic click totals and ranks you by momentum — your last 7 days against the prior 21 — so a fast-growing newcomer can out-rank a flat incumbent. Nothing is voted on or self-reported.",
  },
];

export default async function ProductHuntAlternativesPage() {
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
        The best Product Hunt alternatives to launch your project (2026)
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Product Hunt is a single, crowded launch day decided by the upvotes you can rally in
        a few hours. For most indie makers that&apos;s the wrong shape. Here are the
        alternatives worth your time — grouped by what they actually give you — and the one
        that ranks you by traffic you can&apos;t fake.
      </p>

      <Prose className="mt-8">
        <h2>Launch feeds (the closest thing to a &quot;launch day&quot;)</h2>
        <p>
          If you want the classic post-and-climb format,{" "}
          <a href="https://devhunt.org" target="_blank" rel="noopener noreferrer">DevHunt</a>,{" "}
          <a href="https://startupfa.me" target="_blank" rel="noopener noreferrer">Startup Fame</a>,{" "}
          <a href="https://twelve.tools" target="_blank" rel="noopener noreferrer">Twelve Tools</a>,{" "}
          <a href="https://www.superlaun.ch" target="_blank" rel="noopener noreferrer">Super Launch</a>,{" "}
          <a href="https://launchigniter.com" target="_blank" rel="noopener noreferrer">LaunchIgniter</a> and{" "}
          <a href="https://noonlaunch.com" target="_blank" rel="noopener noreferrer">Noonlaunch</a>{" "}
          all run dated feeds with upvotes or rankings. They&apos;re good for a burst of
          launch-day eyeballs, and each one is another backlink.
        </p>

        <h2>Curated directories (a permanent catalog listing)</h2>
        <p>
          These are less about a moment and more about being findable forever:{" "}
          <a href="https://findly.tools" target="_blank" rel="noopener noreferrer">Findly.tools</a>,{" "}
          <a href="https://www.founder.best" target="_blank" rel="noopener noreferrer">Founder.best</a>,{" "}
          <a href="https://www.tinyshelf.co" target="_blank" rel="noopener noreferrer">tinyshelf</a>,{" "}
          <a href="https://www.foundrlist.com" target="_blank" rel="noopener noreferrer">FoundrList</a> and{" "}
          <a href="https://confettisaas.com" target="_blank" rel="noopener noreferrer">ConfettiSaaS</a>.
          Submit once and the page keeps working in the background.
        </p>

        <h2>RealRank — a rank you earn, not campaign for</h2>
        <p>
          Every option above decides position by votes, recency, or payment. The problem with
          all three: none of them tell a visitor whether your product actually gets traffic.{" "}
          <Link href="/">RealRank</Link> is the alternative for that. You{" "}
          <Link href="/submit">list free in under a minute</Link> — a permanent link, a spot
          on the directory, a badge — and then{" "}
          <Link href="/login">connect Google Search Console</Link> (read-only) to be ranked by
          your <strong>verified</strong> organic clicks. The board sorts by{" "}
          <Link href="/momentum-score">momentum</Link>, so a two-week-old site that&apos;s
          climbing can beat a flat incumbent. No upvote campaign, no pay-to-rank.
        </p>
        <p>
          The honest division of labour: use the launch feeds for a launch-day spike, the
          directories for permanent discovery, and RealRank for the proof that it worked. The
          full map of where to launch is in{" "}
          <Link href="/blog/where-to-launch-your-project-launch-directories">
            our guide to the launch directories
          </Link>
          .
        </p>
      </Prose>

      {/* Live proof */}
      {leaders.length > 0 && (
        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Climbing on RealRank right now</h2>
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
            . <Link href="/" className="text-primary hover:underline">See the full board →</Link>
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
