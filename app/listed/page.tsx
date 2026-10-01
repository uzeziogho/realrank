import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { getListedSites } from "@/lib/listed";
import { categories, categoryLabel, siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ category?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { category } = await searchParams;
  const label = category ? categoryLabel(category) : null;
  const title = label ? `${label} projects — the ${siteConfig.name} directory` : "The directory — freshly listed projects";
  return {
    title,
    description: `Every project listed on ${siteConfig.name}. Open and free to join; connect Search Console to earn a verified, ranked spot on the momentum board.`,
    alternates: { canonical: "/listed" },
    // Category-filtered views are thin/duplicative — keep them out of the index.
    ...(category ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ListedPage({ searchParams }: { searchParams: SearchParams }) {
  const { category: activeRaw } = await searchParams;
  const all = await getListedSites();

  // Count per category (only categories that actually have listings show as chips).
  const counts = new Map<string, number>();
  for (const l of all) if (l.category) counts.set(l.category, (counts.get(l.category) ?? 0) + 1);
  const chips = categories.filter((c) => counts.has(c.slug));

  const active = activeRaw && counts.has(activeRaw) ? activeRaw : null;
  const listings = active ? all.filter((l) => l.category === active) : all;
  const verifiedCount = all.filter((l) => l.ownerVerified).length;

  return (
    <>
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-start gap-5 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-medium">
                {all.length} {all.length === 1 ? "project" : "projects"}
              </span>
              {verifiedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-medium text-primary">
                  <BadgeCheck className="size-3.5" /> {verifiedCount} verified
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">The directory</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Open to everyone, free to join. This is the front door; the{" "}
              <Link href="/leaderboard" className="text-primary hover:underline">
                ranked board
              </Link>{" "}
              stays verified-only (real Google Search Console clicks). A{" "}
              <BadgeCheck className="inline-block size-4 align-[-0.2em] text-primary" /> means the owner
              proved the listing with a badge.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/submit">
              <Plus className="size-4" /> List your project
            </Link>
          </Button>
        </div>
      </section>

      <section className="container py-10">
        {/* Category filter */}
        {chips.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <FilterChip href="/listed" active={active === null} label="All" count={all.length} />
            {chips.map((c) => (
              <FilterChip
                key={c.slug}
                href={`/listed?category=${c.slug}`}
                active={active === c.slug}
                label={c.label}
                count={counts.get(c.slug) ?? 0}
              />
            ))}
          </div>
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
            <p className="font-medium">No projects in {active ? categoryLabel(active) : "this category"} yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link href="/listed" className="text-primary hover:underline">See all projects</Link>{" "}
              or <Link href="/submit" className="text-primary hover:underline">list yours free</Link>.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {listings.map((l) => (
              <ListingCard key={l.host} listing={l} />
            ))}
          </ul>
        )}

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Listings are unverified until their owner adds a badge or connects Search Console. Unverified outbound links are nofollow.
        </p>
      </section>
    </>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "text-primary/70" : "text-muted-foreground/60")}>{count}</span>
    </Link>
  );
}
