import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFavicon } from "@/components/site-favicon";
import { getListingByHost, normalizeHost } from "@/lib/listed";
import { categoryLabel, siteConfig } from "@/lib/config";

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

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild>
          <a
            href={listing.siteUrl}
            target="_blank"
            rel={listing.ownerVerified ? "noopener" : "noopener nofollow"}
          >
            Visit {listing.host} <ArrowUpRight className="size-4" />
          </a>
        </Button>
        {listing.category && (
          <Link
            href="/listed"
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {categoryLabel(listing.category)}
          </Link>
        )}
      </div>

      {/* A listing is owner-verified (it carries our badge), but that is not a
          ranked spot — make the difference (and the path to a real rank) explicit. */}
      <div className="mt-10 rounded-xl border border-dashed border-primary/40 bg-primary/[0.05] p-6 text-center">
        <ShieldCheck className="mx-auto size-6 text-primary" />
        <p className="mt-2 font-medium">A verified listing — not a ranked spot.</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {listing.displayName} is a verified listing (it carries the {siteConfig.name} badge) but
          hasn&apos;t connected Google Search Console, so it isn&apos;t on the ranked momentum board.
          Own this site? Connect Search Console to claim a ranked spot.
        </p>
        <div className="mt-4 flex items-center justify-center">
          <Button asChild>
            <Link href="/login">Get ranked with Search Console</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
