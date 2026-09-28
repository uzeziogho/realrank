import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFavicon } from "@/components/site-favicon";
import { getListedSites, type Listing } from "@/lib/listed";
import { categoryLabel, siteConfig } from "@/lib/config";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "The directory — freshly listed projects",
  description: `Every project listed on ${siteConfig.name}. Open and free to join; connect Search Console to earn a verified, ranked spot on the momentum board.`,
  alternates: { canonical: "/listed" },
};

export default async function ListedPage() {
  const listings = await getListedSites();

  return (
    <>
      <section className="border-b border-border/60">
        <div className="container flex flex-col items-start gap-4 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">The directory</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Freshly listed projects — open to everyone, free to join. This is the front door;
              the{" "}
              <Link href="/leaderboard" className="text-primary hover:underline">
                ranked board
              </Link>{" "}
              stays verified-only (real Google Search Console clicks). A{" "}
              <BadgeCheck className="inline-block size-4 align-[-0.2em] text-primary" /> means the owner
              verified the listing with a badge embed.
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
        {listings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-lg font-medium">Be the first to list a project</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              The directory is brand new. List your project free and grab a permanent link — no account needed.
            </p>
            <Button asChild className="mt-5">
              <Link href="/submit">List your project — free</Link>
            </Button>
          </div>
        ) : (
          <ul className="mx-auto grid max-w-3xl gap-3">
            {listings.map((l) => (
              <ListingRow key={l.host} listing={l} />
            ))}
          </ul>
        )}

        <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-muted-foreground">
          Listings are unverified until their owner adds a badge or connects Search Console. Outbound
          links from unverified listings are nofollow.
        </p>
      </section>
    </>
  );
}

function ListingRow({ listing }: { listing: Listing }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <SiteFavicon url={listing.siteUrl} name={listing.displayName} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link href={`/listed/${listing.host}`} className="truncate font-semibold hover:underline">
            {listing.displayName}
          </Link>
          {listing.ownerVerified ? (
            <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Owner-verified" />
          ) : null}
        </div>
        {listing.tagline && (
          <p className="truncate text-sm text-muted-foreground">{listing.tagline}</p>
        )}
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{listing.host}</span>
          {listing.category && (
            <>
              <span className="text-border">·</span>
              <span>{categoryLabel(listing.category)}</span>
            </>
          )}
        </div>
      </div>
      <a
        href={listing.siteUrl}
        target="_blank"
        // Unverified listings are nofollow; owner-verified ones earn a followed link.
        rel={listing.ownerVerified ? "noopener" : "noopener nofollow"}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={`Visit ${listing.displayName}`}
      >
        <ArrowUpRight className="size-4" />
      </a>
    </li>
  );
}
