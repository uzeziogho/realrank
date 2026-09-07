import Link from "next/link";
import { Suspense } from "react";
import { TrendingUp, BarChart3, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RankingToggle } from "@/components/ranking-toggle";
import { LeaderboardSearch } from "@/components/leaderboard-search";
import { RankingExplainer } from "@/components/ranking-explainer";
import { Leaderboard } from "@/components/leaderboard";
import { LeaderboardJsonLd } from "@/components/json-ld";
import { Pagination } from "@/components/pagination";
import { attachSparklines, type LeaderboardData } from "@/lib/data";
import { injectSponsored } from "@/lib/ranking";
import { siteConfig, categories, type RankingView } from "@/lib/config";
import { cn, timeAgo } from "@/lib/utils";

const PAGE_SIZE = 50;

/** Full-board URL preserving view + query + page params (interactive board lives at /leaderboard). */
function boardHref(view: RankingView, page: number, q = ""): string {
  const params = new URLSearchParams();
  if (view === "volume") params.set("view", "volume");
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/leaderboard?${qs}#leaderboard` : "/leaderboard#leaderboard";
}

/**
 * The ranked leaderboard block, shared by the static homepage preview and the
 * dynamic /leaderboard tool.
 *
 * - `interactive: true` (on /leaderboard) renders the live search box, the
 *   momentum/volume toggle, and full pagination — all of which read/write the
 *   route's `?view/?q/?page` params, so that route is server-rendered per request.
 * - `interactive: false` (on the homepage) renders a static preview: page 1 of
 *   the default momentum view, with the controls swapped for plain links to
 *   /leaderboard. That keeps `/` free of `searchParams`, so it prerenders (ISR)
 *   and serves cached HTML.
 */
export async function LeaderboardSection({
  data,
  view,
  query,
  page,
  interactive,
}: {
  data: LeaderboardData;
  view: RankingView;
  query: string;
  page: number;
  interactive: boolean;
}) {
  const filtered = query
    ? data.organic.filter(
        (s) =>
          s.displayName.toLowerCase().includes(query) ||
          s.siteUrl.toLowerCase().includes(query),
      )
    : data.organic;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageOrganic = filtered.slice(start, start + PAGE_SIZE);
  // Sponsored slots only inject on an unfiltered page 1. Attach sparklines for
  // just this page's rows.
  const pageRows = await attachSparklines(
    query ? pageOrganic : injectSponsored(pageOrganic, data.sponsored),
  );

  return (
    <section id="leaderboard" className="container scroll-mt-20 py-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {view === "momentum" ? "Momentum leaders" : "Volume leaders"}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <TrendingUp className="size-4" />
            {view === "momentum"
              ? "Ranked by growth velocity: last 7 days vs. the prior 21."
              : "Ranked by total organic clicks over the last 28 days."}
          </p>
        </div>

        {interactive ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Suspense fallback={null}>
              <LeaderboardSearch initialQuery={query} />
            </Suspense>
            <Suspense fallback={null}>
              <RankingToggle view={view} counts={data.counts} />
            </Suspense>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div
              role="tablist"
              aria-label="Ranking method"
              className="inline-flex items-center rounded-lg border border-border bg-card p-1"
            >
              <Link
                href="/leaderboard"
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                  "bg-primary text-primary-foreground shadow-sm",
                )}
              >
                <TrendingUp className="size-4" />
                Momentum
              </Link>
              <Link
                href="/leaderboard?view=volume"
                className="inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <BarChart3 className="size-4" />
                Volume
              </Link>
            </div>
            <Link
              href="/leaderboard"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              Search &amp; full rankings →
            </Link>
          </div>
        )}
      </div>

      {/* Plain-English explainer: momentum vs volume vs pending */}
      <div className="mb-6">
        <RankingExplainer />
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
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Award className="size-3.5" /> Founding spots open
          </span>
          <p className="text-lg font-medium">Be founding site #1</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            The board is brand new. Connect Google Search Console, publish your
            verified traffic, and claim the top spot with a permanent Founder badge.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button asChild>
              <Link href="/login">Claim my spot</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/founding">How founding works</Link>
            </Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-lg font-medium">No sites match &ldquo;{query}&rdquo;</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different name, or{" "}
            <Link href="/leaderboard#leaderboard" className="text-primary hover:underline">clear the search</Link>.
          </p>
        </div>
      ) : (
        <>
          <LeaderboardJsonLd sites={pageOrganic} />
          <Leaderboard rows={pageRows} view={view} foundingCutoff={data.founding.cutoff} />

          {interactive ? (
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              buildHref={(p) => boardHref(view, p, query)}
            />
          ) : (
            filtered.length > pageOrganic.length && (
              <div className="mt-8 text-center">
                <Button asChild variant="outline">
                  <Link href="/leaderboard">View all {filtered.length} sites →</Link>
                </Button>
              </div>
            )
          )}

          <div className="mt-4 flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
            <p>
              Showing {start + 1}-{start + pageOrganic.length} of {filtered.length}
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
  );
}
