import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { siteConfig } from "@/lib/config";
import type { Listing } from "@/lib/listed";

/**
 * The homepage's second board: a directory of freshly listed projects, shown
 * BELOW the verified momentum leaderboard. It is deliberately not a ranking —
 * no positions, no momentum — so the verified board's "can't be faked" promise
 * stays intact. Listings arrive verified-owner-first (see getListedSites), so
 * slicing the head naturally surfaces proven listings before unverified ones.
 * Renders nothing when there are no listings, so the homepage never shows an
 * empty shell.
 */
export function JustListed({ listings, total }: { listings: Listing[]; total: number }) {
  if (listings.length === 0) return null;

  return (
    <section className="border-t border-border/60 bg-muted/20">
      <div className="container py-12 sm:py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Just listed</h2>
            <p className="mt-1 max-w-xl text-balance text-sm text-muted-foreground">
              New projects on {siteConfig.name} — open and free to join. Not ranked:
              connect Search Console to earn a verified spot on the board above.
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/listed">
              Browse all {total} <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <ul className="grid gap-3 md:grid-cols-2">
          {listings.map((l) => (
            <ListingCard key={l.host} listing={l} />
          ))}
        </ul>
      </div>
    </section>
  );
}
