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
  title: "Free dofollow backlink directories for new sites (2026)",
  description:
    "A current list of free directories that give new sites a real dofollow backlink — usually in exchange for a badge. How to use them without tripping spam filters, and why a verified listing beats a drive-by link.",
  alternates: { canonical: "/best/free-dofollow-backlink-directories" },
  keywords: [
    "free dofollow backlink directories",
    "dofollow backlinks",
    "free backlinks for new site",
    "startup backlink directories",
    "badge backlink",
  ],
};

const FAQ = [
  {
    q: "What is a dofollow backlink directory?",
    a: "A directory that links to your site with a followed link (no rel=nofollow), so the link passes SEO signal. Many give you one free in exchange for adding their badge to your site — a reciprocal, followed link both ways.",
  },
  {
    q: "Are free dofollow backlinks safe for SEO?",
    a: "Relevant ones from real maker and launch directories are fine and genuinely helpful. The risk is volume and irrelevance: hundreds of links appearing overnight from unrelated link farms can look manipulative. Stick to directories in your space and add them over a few days, not all at once.",
  },
  {
    q: "How many should I submit to?",
    a: "The value is cumulative, so submit to every relevant one — but prioritise directories with real audiences over pure link farms. A handful of relevant followed links beats a hundred junk ones.",
  },
  {
    q: "What makes RealRank different from a backlink directory?",
    a: "RealRank gives you a listing and a link like the others, but it also ranks you by verified Google Search Console traffic. So the page isn't just a backlink — it's proof your site actually gets organic clicks, which a plain directory link can never show.",
  },
];

export default async function DofollowDirectoriesPage() {
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
        Free dofollow backlink directories for new sites (2026)
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        A new site starts with no authority, and backlinks are how it earns some. These
        directories hand you a real followed link for free — usually for adding their badge.
        Here&apos;s the shortlist, how to use them safely, and why a verified listing is worth
        more than a drive-by link.
      </p>

      <Prose className="mt-8">
        <h2>Directories that give a free dofollow link</h2>
        <p>
          These lean explicitly into the backlink trade — add their badge, get a followed link
          back:{" "}
          <a href="https://dang.ai" target="_blank" rel="noopener noreferrer">DANG!</a>,{" "}
          <a href="https://easydofollow.dev" target="_blank" rel="noopener noreferrer">EasyDoFollow</a> and{" "}
          <a href="https://noonlaunch.com" target="_blank" rel="noopener noreferrer">Noonlaunch</a>.
          Plenty of launch and maker directories also pass followed links as part of a normal
          listing —{" "}
          <a href="https://findly.tools" target="_blank" rel="noopener noreferrer">Findly.tools</a>,{" "}
          <a href="https://www.founder.best" target="_blank" rel="noopener noreferrer">Founder.best</a>,{" "}
          <a href="https://devhunt.org" target="_blank" rel="noopener noreferrer">DevHunt</a> and{" "}
          <a href="https://startupfa.me" target="_blank" rel="noopener noreferrer">Startup Fame</a>{" "}
          among them. The fuller map is in{" "}
          <Link href="/blog/where-to-launch-your-project-launch-directories">
            our launch-directories guide
          </Link>
          .
        </p>

        <h2>How to use them without tripping spam filters</h2>
        <ul>
          <li>
            <strong>Relevance over volume.</strong> A followed link from a real maker
            directory in your space is worth more than fifty from unrelated link farms.
          </li>
          <li>
            <strong>Stagger the badges.</strong> Don&apos;t add twenty footer links in one
            hour — spread them over a few days so the profile grows like a real one.
          </li>
          <li>
            <strong>Keep the anchor natural.</strong> Your brand name or the directory&apos;s
            own badge text is fine; stuffing exact-match keywords into every anchor is the
            pattern filters look for.
          </li>
        </ul>

        <h2>A link is table stakes. Proof is the edge.</h2>
        <p>
          A directory backlink helps you get found — but it says nothing about whether anyone
          shows up once they do. <Link href="/">RealRank</Link> gives you the same free
          listing and link, then goes further: connect{" "}
          <Link href="/login">Google Search Console</Link> (read-only) and your{" "}
          <strong>verified</strong> organic clicks rank you on a public board. The result is a
          page that&apos;s both a backlink <em>and</em> proof of traffic — something a plain
          directory entry can never be. You can{" "}
          <Link href="/submit">list free in under a minute</Link> to start.
        </p>
      </Prose>

      {/* Live proof */}
      {leaders.length > 0 && (
        <section className="mt-10 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Verified and climbing on RealRank</h2>
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
        <p className="text-xs text-muted-foreground">Free · permanent link · a real backlink</p>
      </div>
    </div>
  );
}
