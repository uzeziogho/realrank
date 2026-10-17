import Link from "next/link";
import { BadgeCheck, ArrowUpRight, MousePointerClick } from "lucide-react";
import { SiteFavicon } from "@/components/site-favicon";
import { VisitLink } from "@/components/visit-link";
import { categoryLabel, VISITS_FLOOR } from "@/lib/config";
import { formatCompact } from "@/lib/utils";
import type { Listing } from "@/lib/listed";

/**
 * A single directory listing ($0 tier). Deliberately NOT a ranked row: no rank
 * number, no momentum score — a listing is not a ranking. Shared by the /listed
 * directory and the homepage "Just listed" section so both stay identical.
 * Outbound links are nofollow until the owner proves the listing (owner_verified
 * via the badge), which also shows the verified checkmark.
 *
 * `visits` is outbound click-throughs this listing sent to the site in the last
 * 28 days — the one piece of value a free listing can prove. It is rendered
 * only at or above VISITS_FLOOR; below that the number says nothing and reads
 * as evidence against the listing.
 */
export function ListingCard({ listing, visits }: { listing: Listing; visits?: number }) {
  const showVisits = typeof visits === "number" && visits >= VISITS_FLOOR;
  return (
    <li className="group relative flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
      {/* The whole card reads as clickable, so the whole card is clickable.
          aria-hidden with tabIndex -1 keeps the name link the one focusable
          target; the real links sit above it on z-10. */}
      <Link
        href={`/listed/${listing.host}`}
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 z-0"
      />
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background">
        <SiteFavicon url={listing.siteUrl} name={listing.displayName} size={36} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/listed/${listing.host}`}
            className="relative z-10 truncate font-semibold hover:underline"
          >
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
              className="relative z-10 shrink-0 rounded-full border border-border px-2 py-0.5 hover:text-foreground"
            >
              {categoryLabel(listing.category)}
            </Link>
          )}
          {showVisits && (
            <span
              title={`${visits} visits sent to ${listing.host} from RealRank in the last 28 days`}
              className="inline-flex shrink-0 items-center gap-1 tabular-nums"
            >
              <MousePointerClick className="size-3" /> {formatCompact(visits)} visits
            </span>
          )}
        </div>
      </div>
      <VisitLink
        href={listing.siteUrl}
        host={listing.host}
        rel={listing.ownerVerified ? "noopener" : "noopener nofollow"}
        className="relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors group-hover:border-primary/40 hover:bg-accent hover:text-foreground"
        aria-label={`Visit ${listing.displayName}`}
      >
        <ArrowUpRight className="size-4" />
      </VisitLink>
    </li>
  );
}
