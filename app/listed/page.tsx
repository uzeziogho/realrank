import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { BoardViews } from "@/components/board-views";
import { DirectorySidebar } from "@/components/directory-sidebar";
import { getListedSites } from "@/lib/listed";
import { getOutboundClicks } from "@/lib/data";
import { categories, categoryLabel, siteConfig } from "@/lib/config";

type SearchParams = Promise<{ category?: string; sort?: string; q?: string; verified?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { category, verified } = await searchParams;
  const label = category ? categoryLabel(category) : null;
  const title = label ? `${label} projects — the ${siteConfig.name} directory` : "The directory — freshly listed projects";
  return {
    title,
    description: `Every project listed on ${siteConfig.name}. Open and free to join; connect Search Console to earn a verified, ranked spot on the momentum board.`,
    alternates: { canonical: "/listed" },
    // Filtered views (category or verified-only) are thin/duplicative of the
    // canonical directory and the indexable /best/<category> roundups — keep
    // them crawlable but out of the index.
    ...(category || verified ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ListedPage({ searchParams }: { searchParams: SearchParams }) {
  const { category: activeRaw, sort: sortRaw, q: qRaw, verified: verifiedRaw } = await searchParams;
  // Visit counts ride along with the directory read (one query for every host)
  // and also drive the "Most visited" sort.
  const [all, visits] = await Promise.all([getListedSites(), getOutboundClicks()]);

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
  const verifiedCount = all.filter((l) => l.ownerVerified).length;

  // Search → category → verified → sort. getListedSites() is already
  // verified-first then newest (the "Newest" order); the other sorts re-order.
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
  if (sort === "visited") {
    listings = [...listings].sort((a, b) => (visits.get(b.host) ?? 0) - (visits.get(a.host) ?? 0));
  } else if (sort === "az") {
    listings = [...listings].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  const title = active ? `${categoryLabel(active)} projects` : "The directory";

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
            <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
              {listings.map((l, i) => (
                <ListingCard key={l.host} listing={l} visits={visits.get(l.host) ?? 0} priority={i < 3} />
              ))}
            </ul>
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
