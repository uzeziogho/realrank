import Link from "next/link";
import { BadgeCheck, ArrowUpRight } from "lucide-react";
import { SiteFavicon } from "@/components/site-favicon";
import { categoryLabel } from "@/lib/config";
import type { Listing } from "@/lib/listed";

/**
 * A single directory listing ($0 tier). Deliberately NOT a ranked row: no rank
 * number, no momentum score — a listing is not a ranking. Shared by the /listed
 * directory and the homepage "Just listed" section so both stay identical.
 * Listings are badge-verified at creation, so outbound links are dofollow; the
 * nofollow branch stays as a defensive guard for any legacy unverified row.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <li className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background">
        <SiteFavicon url={listing.siteUrl} name={listing.displayName} size={36} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link href={`/listed/${listing.host}`} className="truncate font-semibold hover:underline">
            {listing.displayName}
          </Link>
          {listing.ownerVerified && (
            <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Owner-verified" />
          )}
        </div>
        {listing.tagline && (
          <p className="truncate text-sm text-muted-foreground">{listing.tagline}</p>
        )}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate text-muted-foreground/70">{listing.host}</span>
          {listing.category && (
            <Link
              href={`/listed?category=${listing.category}`}
              className="shrink-0 rounded-full border border-border px-2 py-0.5 hover:text-foreground"
            >
              {categoryLabel(listing.category)}
            </Link>
          )}
        </div>
      </div>
      <a
        href={listing.siteUrl}
        target="_blank"
        rel={listing.ownerVerified ? "noopener" : "noopener nofollow"}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors group-hover:border-primary/40 hover:bg-accent hover:text-foreground"
        aria-label={`Visit ${listing.displayName}`}
      >
        <ArrowUpRight className="size-4" />
      </a>
    </li>
  );
}
