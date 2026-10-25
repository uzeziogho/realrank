import Link from "next/link";
import { BadgeCheck, ArrowUpRight, MousePointerClick } from "lucide-react";
import { SitePreview } from "@/components/site-preview";
import { SiteFavicon } from "@/components/site-favicon";
import { VisitLink } from "@/components/visit-link";
import { categoryLabel, VISITS_FLOOR } from "@/lib/config";
import { formatCompact } from "@/lib/utils";
import type { Listing } from "@/lib/listed";

/**
 * A single directory listing ($0 tier). A browse-and-click card: a preview
 * image (the site's og:image), then name, tagline and a prominent "Visit"
 * button that goes straight to the site so a visitor is one click from the
 * product. The whole card also links to the listing's own profile. Deliberately
 * NOT a ranked row — no rank number, no momentum score. Shared by the /listed
 * directory, the homepage "Just listed" section, launches and alternatives.
 * Outbound links are nofollow until the owner proves ownership (the badge).
 *
 * `visits` is the all-time click-throughs this listing sent to the site — the
 * one piece of value a free listing can prove — shown only at or above
 * VISITS_FLOOR; below that the number says nothing.
 */
export function ListingCard({ listing, visits }: { listing: Listing; visits?: number }) {
  const showVisits = typeof visits === "number" && visits >= VISITS_FLOOR;
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40">
      {/* The whole card links to the profile; the real links sit above on z-10,
          and the focusable name link is the keyboard target. */}
      <Link href={`/listed/${listing.host}`} aria-hidden tabIndex={-1} className="absolute inset-0 z-0" />

      <SitePreview
        siteUrl={listing.siteUrl}
        host={listing.host}
        name={listing.displayName}
        className="aspect-[16/9] border-b border-border"
      />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background">
            <SiteFavicon url={listing.siteUrl} name={listing.displayName} size={30} />
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
            <span className="block truncate text-xs text-muted-foreground/70">{listing.host}</span>
          </div>
        </div>

        {listing.tagline && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{listing.tagline}</p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1 text-xs text-muted-foreground">
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
              title={`${visits} visits sent to ${listing.host} from RealRank`}
              className="inline-flex shrink-0 items-center gap-1 tabular-nums"
            >
              <MousePointerClick className="size-3" /> {formatCompact(visits)} visits
            </span>
          )}
          <VisitLink
            href={listing.siteUrl}
            host={listing.host}
            rel={listing.ownerVerified ? "noopener" : "noopener nofollow"}
            className="relative z-10 ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-input px-2.5 py-1 font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
            aria-label={`Visit ${listing.displayName}`}
          >
            Visit <ArrowUpRight className="size-3.5" />
          </VisitLink>
        </div>
      </div>
    </li>
  );
}
