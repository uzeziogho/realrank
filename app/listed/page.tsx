import type { Metadata } from "next";
import Link from "next/link";
import { WeeklyActivity, joinedThisWeek } from "@/components/weekly-activity";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { BoardViews } from "@/components/board-views";
import { DirectorySidebar } from "@/components/directory-sidebar";
import { SpotlightLane } from "@/components/spotlight-lane";
import { Pagination } from "@/components/pagination";
import { getListedSites } from "@/lib/listed";
import { getOutboundClicks, getLeaderboardData } from "@/lib/data";
import { activeSpotlights, spotlightAvailability } from "@/lib/spotlight";
import { categories, categoryLabel, siteConfig } from "@/lib/config";
import { ADDED_FILTERS, addedCounts, addedWithin, groupByDate, parseAdded } from "@/lib/listing-dates";

type SearchParams = Promise<{ category?: string; sort?: string; q?: string; verified?: string; page?: string; added?: string }>;

/** Cards per page — 8 rows of 3 on desktop, short enough to scan on a phone. */
const PAGE_SIZE = 24;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { category, verified, page: pageRaw, added } = await searchParams;
  const label = category ? categoryLabel(category) : null;
  // Clamp to the real page count (cached read) so an out-of-range ?page=
  // names the page actually shown.
  const lastPage = Math.max(1, Math.ceil((await getListedSites()).length / PAGE_SIZE));
  const page = Math.min(lastPage, Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1));
  const base = label ? `${label} projects — the ${siteConfig.name} directory` : "The directory — freshly listed projects";
  return {
    title: page > 1 ? `${base} — Page ${page}` : base,
    description: `Every project listed on ${siteConfig.name}. Open and free to join; connect Search Console to earn a verified, ranked spot on the momentum board.`,
    // Each page of the unfiltered directory names itself, so pages 2+ (and the
    // listings on them) stay discoverable instead of folding into page 1.
    alternates: { canonical: page > 1 ? `/listed?page=${page}` : "/listed" },
    // Filtered views (category or verified-only) are thin/duplicative of the
    // canonical directory and the indexable /best/<category> roundups — keep
    // them crawlable but out of the index.
    // The "Added" filter changes daily, so it stays out of the index too.
    ...(category || verified || parseAdded(added) ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ListedPage({ searchParams }: { searchParams: SearchParams }) {
  const { category: activeRaw, sort: sortRaw, q: qRaw, verified: verifiedRaw, page: pageRaw, added: addedRaw } = await searchParams;
  // Visit counts ride along with the directory read (one query for every host)
  // and also drive the "Most visited" sort.
  const [all, visits, weekVisits, board] = await Promise.all([
    getListedSites(),
    getOutboundClicks(),
    getOutboundClicks(7),
    getLeaderboardData("momentum").catch(() => null),
  ]);

  // Count per category (only categories that actually have listings show up).
  const counts = new Map<string, number>();
  for (const l of all) if (l.category) counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
  const sidebarCategories = categories
    .filter((c) => counts.has(c.slug))
    .map((c) => ({ slug: c.slug, label: c.label, count: counts.get(c.slug) ?? 0 }));

  const active = activeRaw && counts.has(activeRaw) ? activeRaw : null;
  const sort = sortRaw === "visited" || sortRaw === "az" ? sortRaw : "new";
  const q = (qRaw ?? "").trim().toLowerCase();
  const verified = verifiedRaw === "1";
  const added = parseAdded(addedRaw);
  const now = Date.now();
  const verifiedCount = all.filter((l) => l.ownerVerified).length;

  // Spotlight lane: paid (labelled) + earned (this week's fastest-growing
  // verified site). Category views show only that category's spotlights; the
  // earned mover shows on the unfiltered directory.
  const { slotsLeft } = spotlightAvailability(all);
  const laneSpotlights = activeSpotlights(all).filter((l) => !active || l.category === active);
  const mover = board?.organic.find((s) => !s.pending) ?? null;

  // Search → category → verified → added → sort. getListedSites() comes
  // verified-first; every sort here re-orders, and "Newest" is purely by date.
  let listings = all;
  if (q) {
    listings = listings.filter((l) =>
      `${l.displayName} ${l.host} ${l.tagline ?? ""} ${l.alternativeTo ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }
  if (active) listings = listings.filter((l) => l.category === active);
  if (verified) listings = listings.filter((l) => l.ownerVerified);
  if (added) listings = listings.filter((l) => addedWithin(l.createdAt, added, now));
  if (sort === "new") {
    listings = [...listings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  } else if (sort === "visited") {
    listings = [...listings].sort((a, b) => (visits.get(b.host) ?? 0) - (visits.get(a.host) ?? 0));
  } else if (sort === "az") {
    listings = [...listings].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  // Paginate after filtering + sorting. Out-of-range pages clamp to the last.
  const totalPages = Math.max(1, Math.ceil(listings.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(pageRaw ?? "1", 10) || 1));
  const start = (page - 1) * PAGE_SIZE;
  const pageListings = listings.slice(start, start + PAGE_SIZE);
  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    if (active) sp.set("category", active);
    if (sort !== "new") sp.set("sort", sort);
    if (qRaw?.trim()) sp.set("q", qRaw.trim());
    if (verified) sp.set("verified", "1");
    if (added) sp.set("added", added);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/listed?${qs}` : "/listed";
  };

  const title = active ? `${categoryLabel(active)} projects` : "The directory";
  const joined = joinedThisWeek(all);
  const visitsThisWeek = [...weekVisits.values()].reduce((n, v) => n + v, 0);

  return (
    <section className="container py-8">
      <BoardViews className="mb-7" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <DirectorySidebar
          categories={sidebarCategories}
          total={all.length}
          active={active}
          sort={sort}
          q={qRaw ?? ""}
          verified={verified}
          added={added}
          addedCounts={addedCounts(all, now)}
        />

        <main className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              <span className="text-sm text-muted-foreground">
                {listings.length} {listings.length === 1 ? "project" : "projects"}
                {verified && " · verified"}
              </span>
            </div>
            <Link href="/alternatives-to" className="text-sm text-primary hover:underline">
              Alternatives to popular tools →
            </Link>
          </div>

          {!active && !q && !added && page === 1 && (
            <WeeklyActivity
              joined={joined.count}
              latestName={joined.latest?.displayName ?? null}
              latestAt={joined.latest?.createdAt ?? null}
              noun="the directory"
              visits={visitsThisWeek}
              cta={{ label: "List yours free", href: "/submit", event: "list_click", source: "directory_activity" }}
            />
          )}

          <p className="max-w-2xl text-sm text-muted-foreground">
            Open to everyone, free to join. The{" "}
            <Link href="/leaderboard" className="text-primary hover:underline">
              ranked board
            </Link>{" "}
            stays verified-only (real Google Search Console clicks). A{" "}
            <BadgeCheck className="inline-block size-4 align-[-0.2em] text-primary" /> means the owner
            proved they control the site.{" "}
            {verifiedCount > 0 && (
              <span className="text-muted-foreground/80">{verifiedCount} verified so far.</span>
            )}
          </p>

          {!q && all.length > 0 && (
            <SpotlightLane
              spotlights={laneSpotlights}
              mover={!active && !verified ? mover : null}
              visits={visits}
              slotsLeft={slotsLeft}
              className="rounded-xl border border-border/60 bg-muted/20 p-4"
            />
          )}

          {all.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
              <p className="text-lg font-medium">Be the first to list a project</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                The directory is brand new. List your project free and grab a permanent link — no account needed.
              </p>
              <Button asChild className="mt-5">
                <Link href="/submit">List your project — free</Link>
              </Button>
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
              <p className="font-medium">
                {q
                  ? `No projects match “${qRaw}”`
                  : added
                    ? `Nothing listed in the ${ADDED_FILTERS.find((f) => f.key === added)!.label.toLowerCase()}${active ? ` in ${categoryLabel(active)}` : ""}`
                  : verified
                    ? `No verified projects${active ? ` in ${categoryLabel(active)}` : ""} yet`
                    : `No projects in ${active ? categoryLabel(active) : "this category"} yet`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <Link href="/listed" className="text-primary hover:underline">See all projects</Link>{" "}
                or <Link href="/submit" className="text-primary hover:underline">list yours free</Link>.
              </p>
            </div>
          ) : (
            <>
              {sort === "new" ? (
                // Newest view: date headers ("This week", "Last week", "October")
                // give the timeline a calendar would, without the empty days.
                <div className="flex flex-col gap-7">
                  {groupByDate(pageListings, now).map((g, gi) => (
                    <section key={g.label} aria-labelledby={`added-${gi}`}>
                      <h2
                        id={`added-${gi}`}
                        className="mb-3 flex items-baseline gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground"
                      >
                        {g.label}
                        <span className="tabular-nums text-muted-foreground/60">{g.items.length}</span>
                      </h2>
                      <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                        {g.items.map((l) => (
                          <ListingCard
                            key={l.host}
                            listing={l}
                            visits={visits.get(l.host) ?? 0}
                            priority={page === 1 && pageListings.indexOf(l) < 3}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : (
                <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                  {pageListings.map((l, i) => (
                    <ListingCard key={l.host} listing={l} visits={visits.get(l.host) ?? 0} priority={page === 1 && i < 3} />
                  ))}
                </ul>
              )}
              {totalPages > 1 && (
                <div className="flex flex-col items-center gap-1">
                  <Pagination currentPage={page} totalPages={totalPages} buildHref={pageHref} label="Directory pages" />
                  <p className="text-xs text-muted-foreground">
                    Showing {start + 1}–{start + pageListings.length} of {listings.length}
                  </p>
                </div>
              )}
            </>
          )}

          {sidebarCategories.length > 0 && (
            <nav className="mt-6 border-t border-border/60 pt-7" aria-label="Category roundups">
              <h2 className="text-sm font-semibold text-foreground">Browse the best of each category</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Curated roundups of every listed project, by category.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {sidebarCategories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/best/${c.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      Best {c.label}
                      <span className="tabular-nums text-muted-foreground/60">{c.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" />
            Listings are unverified until their owner adds a badge or connects Search Console. Unverified outbound links are nofollow.
          </p>
        </main>
      </div>
    </section>
  );
}
