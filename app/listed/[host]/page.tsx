import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFavicon } from "@/components/site-favicon";
import { VisitLink } from "@/components/visit-link";
import { VisitsChain } from "@/components/visits-chain";
import { VerifyListing } from "@/components/verify-listing";
import { ListingCard } from "@/components/listing-card";
import { getListingByHost, getListedSites, normalizeHost } from "@/lib/listed";
import { getOutboundClicks } from "@/lib/data";
import { categoryLabel, siteConfig, VISITS_FLOOR } from "@/lib/config";

export const revalidate = 300;

type Params = Promise<{ host: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { host: raw } = await params;
  const host = normalizeHost(raw) ?? raw.toLowerCase();
  const listing = await getListingByHost(host);
  if (!listing) return { title: "Listing not found", robots: { index: false, follow: false } };

  return {
    title: `${listing.displayName} — listed on ${siteConfig.name}`,
    description: listing.tagline ?? listing.description ?? `${listing.displayName} is listed on ${siteConfig.name}.`,
    alternates: { canonical: `/listed/${host}` },
    // Listings are badge-verified at creation, so they index normally. The
    // guard stays as a defensive fallback for any legacy unverified row.
    robots: listing.ownerVerified ? undefined : { index: false, follow: false },
  };
}

export default async function ListingProfilePage({ params }: { params: Params }) {
  const { host: raw } = await params;
  const host = normalizeHost(raw) ?? raw.toLowerCase();
  const listing = await getListingByHost(host);
  if (!listing) notFound();

  // What this listing has actually done for the site: all-time outbound clicks
  // RealRank sent it, shown as the attribution chain (only above VISITS_FLOOR).
  // The same read + the directory feed the "more to explore" rail, so a visitor
  // who lands on one profile has somewhere to go next instead of a dead end.
  const [visitsMap, allListings] = await Promise.all([getOutboundClicks(), getListedSites()]);
  const visits = visitsMap.get(listing.host) ?? 0;
  const sameCategory = listing.category
    ? allListings.filter((l) => l.host !== listing.host && l.category === listing.category)
    : [];
  const related = (sameCategory.length > 0
    ? sameCategory
    : allListings.filter((l) => l.host !== listing.host)
  ).slice(0, 6);

  return (
    <div className="container max-w-2xl py-12">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Directory", href: "/listed" },
          { name: listing.displayName },
        ]}
      />

      <div className="mt-6 flex items-start gap-4">
        <SiteFavicon url={listing.siteUrl} name={listing.displayName} size={52} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight">{listing.displayName}</h1>
            {listing.ownerVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <BadgeCheck className="size-3.5" /> Verified owner
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Unverified
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{listing.host}</p>
        </div>
      </div>

      {listing.tagline && <p className="mt-6 text-lg">{listing.tagline}</p>}
      {listing.description && (
        <p className="mt-3 text-muted-foreground">{listing.description}</p>
      )}

      {/* The traffic this listing has delivered, as an attribution chain:
          directory → listing → visits sent. Only above VISITS_FLOOR. */}
      {visits >= VISITS_FLOOR && (
        <div className="mt-6">
          <VisitsChain siteUrl={listing.siteUrl} host={listing.host} visits={visits} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <VisitLink
          href={listing.siteUrl}
          host={listing.host}
          rel={listing.ownerVerified ? "noopener" : "noopener nofollow"}
          className={buttonVariants()}
        >
          Visit {listing.host} <ArrowUpRight className="size-4" />
        </VisitLink>
        {listing.category && (
          <Link
            href="/listed"
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {categoryLabel(listing.category)}
          </Link>
        )}
      </div>

      {/* Verifying means adding the badge to your own site, which means leaving
          the submit page and shipping a change — so the panel has to be here
          too, or an owner who comes back can never finish. The host is in the
          URL and the badge check is server-side, so nothing is granted here. */}
      {!listing.ownerVerified && (
        <div className="mt-8">
          <VerifyListing host={listing.host} />
        </div>
      )}

      {/* A listing isn't a ranked spot — make the difference (and the path to a
          real rank) explicit. Copy adapts to whether the owner has verified. */}
      <div className="mt-10 rounded-xl border border-dashed border-primary/40 bg-primary/[0.05] p-6 text-center">
        <ShieldCheck className="mx-auto size-6 text-primary" />
        <p className="mt-2 font-medium">A free listing — not a ranked spot.</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {listing.ownerVerified
            ? `${listing.displayName} is an owner-verified listing, but it hasn't connected Google Search Console, so it isn't on the ranked momentum board.`
            : `${listing.displayName} is listed but hasn't connected Google Search Console, so it isn't on the ranked momentum board.`}{" "}
          Own this site? Connect Search Console to claim a verified, ranked spot.
        </p>
        <div className="mt-4 flex items-center justify-center">
          <Button asChild>
            <Link href="/login">Get ranked with Search Console</Link>
          </Button>
        </div>
      </div>

      {/* Keep the visitor browsing: a rail of related listings (same category
          first, then the rest of the directory) so a profile isn't a dead end. */}
      {related.length > 0 && (
        <section className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              More {listing.category ? `in ${categoryLabel(listing.category)}` : "to explore"}
            </h2>
            <Link
              href={listing.category ? `/listed?category=${listing.category}` : "/listed"}
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              Browse all →
            </Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((l) => (
              <ListingCard key={l.host} listing={l} visits={visitsMap.get(l.host) ?? 0} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
