import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RefreshCw, ShieldCheck, TrendingUp, LineChart, BarChart3, Award, GitCompare, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RankingToggle } from "@/components/ranking-toggle";
import { Leaderboard } from "@/components/leaderboard";
import { LeaderboardJsonLd } from "@/components/json-ld";
import { Pagination } from "@/components/pagination";
import { getLeaderboardData, attachSparklines, getRecentlyJoined } from "@/lib/data";
import { injectSponsored } from "@/lib/ranking";
import { RankChecker } from "@/components/rank-checker";
import { WaitlistForm } from "@/components/waitlist-form";
import { LeaderboardSearch } from "@/components/leaderboard-search";
import { siteConfig, categories, type RankingView } from "@/lib/config";
import { formatCompact, timeAgo, hostname } from "@/lib/utils";

// Incremental Static Regeneration — full ranked list is in the initial HTML,
// refreshed at most hourly (and on-demand after the cron writes new data).
export const revalidate = 3600;

const PAGE_SIZE = 50;

type SearchParams = Promise<{ view?: string; page?: string; q?: string }>;

function parseView(v?: string): RankingView {
  return v === "volume" ? "volume" : "momentum";
}

function parsePage(v: string | undefined, totalPages: number): number {
  const n = Number.parseInt(v ?? "1", 10);
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(n, Math.max(1, totalPages));
}

/** Build a leaderboard URL preserving view + query + page params. */
function leaderboardHref(view: RankingView, page: number, q = ""): string {
  const params = new URLSearchParams();
  if (view === "volume") params.set("view", "volume");
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/?${qs}#leaderboard` : "/#leaderboard";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const view = parseView(sp.view);
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const base =
    view === "volume"
      ? "Top Websites by Organic Traffic Volume"
      : "Fastest-Growing Websites by Organic Traffic";
  const title = page > 1 ? `${base} — Page ${page}` : base;

  const params = new URLSearchParams();
  if (view === "volume") params.set("view", "volume");
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();

  // Search-result views point their canonical at the clean board and stay out
  // of the index (avoids thin/duplicate query pages).
  const searching = Boolean(sp.q?.trim());

  return {
    title,
    description: siteConfig.description,
    alternates: { canonical: searching ? "/" : qs ? `/?${qs}` : "/" },
    ...(searching ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const view = parseView(sp.view);
  const data = await getLeaderboardData(view);
  const recent = await getRecentlyJoined(6);

  // For the rank checker: hostnames already on the board + the top volume.
  const knownHosts = data.organic.map((s) => hostname(s.siteUrl).toLowerCase());
  const topClicks = data.organic.reduce((m, s) => Math.max(m, s.clicks28d), 0);

  // Search filter (name or hostname). Kept server-side so results stay crawlable.
  const query = (sp.q ?? "").trim().toLowerCase();
  const filtered = query
    ? data.organic.filter(
        (s) =>
          s.displayName.toLowerCase().includes(query) ||
          hostname(s.siteUrl).toLowerCase().includes(query),
      )
    : data.organic;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = parsePage(sp.page, totalPages);
  const start = (page - 1) * PAGE_SIZE;
  const pageOrganic = filtered.slice(start, start + PAGE_SIZE);
  // Re-inject sponsored slots for this page (they only match ranks #10/#20 → page 1).
  // Skip ads while searching. Attach sparklines for just this page's rows.
  const pageRows = await attachSparklines(
    query ? pageOrganic : injectSponsored(pageOrganic, data.sponsored),
  );

  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-16 text-center sm:py-24">
          <Link
            href="/about"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShieldCheck className="size-3.5 text-primary" />
            Every ranking verified via Google Search Console
          </Link>

          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            The organic traffic leaderboard for the whole web
          </h1>
          <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground">
            {siteConfig.tagline} Ranked by <strong className="text-foreground">momentum</strong>{" "}
            so fast-growing sites can beat the giants — not just whoever&apos;s biggest.
          </p>

          {/* Personalized entry point — check your domain, then connect. */}
          <div className="mt-8 flex w-full flex-col items-center">
            <RankChecker knownHosts={knownHosts} topClicks={topClicks} totalSites={data.totalSites} />
            <p className="mt-3 text-sm text-muted-foreground">
              or{" "}
              <Link href="/login" className="text-primary hover:underline">connect Google Search Console</Link>
              {" · "}
              <Link href="#leaderboard" className="hover:text-foreground">view the leaderboard</Link>
            </p>
          </div>

          {/* Aggregate stats */}
          <dl className="mt-12 grid grid-cols-3 gap-8 sm:gap-16">
            <Stat label="Sites ranked" value={formatCompact(data.totalSites)} />
            <Stat
              label="Organic clicks / 28d"
              value={formatCompact(data.totalClicks28d)}
            />
            <Stat
              label="Refreshed"
              value={data.lastUpdated ? timeAgo(data.lastUpdated) : "—"}
              icon={<RefreshCw className="size-4" />}
            />
          </dl>

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

      {/* Leaderboard */}
      <section id="leaderboard" className="container scroll-mt-20 py-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {view === "momentum" ? "Momentum leaders" : "Volume leaders"}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <TrendingUp className="size-4" />
              {view === "momentum"
                ? "Ranked by growth velocity — last 7 days vs. the prior 21."
                : "Ranked by total organic clicks over the last 28 days."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Suspense fallback={null}>
              <LeaderboardSearch initialQuery={query} />
            </Suspense>
            <Suspense fallback={null}>
              <RankingToggle view={view} />
            </Suspense>
          </div>
        </div>

        {/* Category filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {c.label}
            </Link>
          ))}
        </div>

        {data.totalSites === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-lg font-medium">No sites on the board yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first — connect Google Search Console and publish your site to
              claim the top spot.
            </p>
            <Button asChild className="mt-5">
              <Link href="/dashboard">Add your site</Link>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-lg font-medium">No sites match &ldquo;{query}&rdquo;</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different name, or{" "}
              <Link href="/#leaderboard" className="text-primary hover:underline">clear the search</Link>.
            </p>
          </div>
        ) : (
          <>
            <LeaderboardJsonLd sites={pageOrganic} />
            <Leaderboard rows={pageRows} view={view} />

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              buildHref={(p) => leaderboardHref(view, p, query)}
            />

            <div className="mt-4 flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
              <p>
                Showing {start + 1}–{start + pageOrganic.length} of {filtered.length}
                {query ? ` matching “${query}”` : ""}.
                Last updated {data.lastUpdated ? timeAgo(data.lastUpdated) : "—"}; refreshes
                every {siteConfig.refreshCadenceHours} hours.
              </p>
              {data.usingDummyData && (
                <p className="rounded-full border border-border px-2 py-0.5">
                  Preview data — connect a site to publish real numbers
                </p>
              )}
            </div>
          </>
        )}
      </section>

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
              body="Track which marketing channels actually bring paying customers, ranked by revenue and efficiency."
              href="/blog/introducing-channels"
              cta="Meet Channels"
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
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Prove your growth. Get discovered.
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Connect Google Search Console (read-only), pick which verified
            properties to publish, and let real clicks decide your rank.
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/login">Connect Search Console</Link>
          </Button>

          {/* Fallback for visitors not ready to connect Google yet. */}
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-border/60 pt-6">
            <p className="text-sm text-muted-foreground">Not ready to connect? Get launch updates.</p>
            <WaitlistForm source="home" />
          </div>
        </div>
      </section>
    </>
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

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center">
      <dt className="order-2 mt-1 text-xs text-muted-foreground">{label}</dt>
      <dd className="order-1 flex items-center gap-1.5 text-2xl font-bold tabular-nums sm:text-3xl">
        {icon}
        {value}
      </dd>
    </div>
  );
}
