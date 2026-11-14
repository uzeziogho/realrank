import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ArrowUpRight, ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { SiteFavicon } from "@/components/site-favicon";
import { SoftwareApplicationJsonLd } from "@/components/json-ld";
import { VisitLink } from "@/components/visit-link";
import { VisitsChain } from "@/components/visits-chain";
import { VerifyListing } from "@/components/verify-listing";
import { ShareListing } from "@/components/share-listing";
import { TrackedLink } from "@/components/tracked-link";
import { SPOTLIGHT, isSpotlighted, spotlightAvailability, spotlightCheckoutUrl, shortDate } from "@/lib/spotlight";
import { ListingCard } from "@/components/listing-card";
import { getListingByHost, getListedSites, normalizeHost } from "@/lib/listed";
import { getOutboundClicks, getActiveSites } from "@/lib/data";
import { hostname } from "@/lib/utils";
import { categoryLabel, siteConfig, VISITS_FLOOR, PRICING_LABELS, PLATFORM_LABELS } from "@/lib/config";

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

export default async function ListingProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ spotlight?: string; status?: string }>;
}) {
  const { host: raw } = await params;
  const sp = await searchParams;
  const host = normalizeHost(raw) ?? raw.toLowerCase();
  const listing = await getListingByHost(host);
  if (!listing) notFound();

  // What this listing has actually done for the site: all-time outbound clicks
  // RealRank sent it, shown as the attribution chain (only above VISITS_FLOOR).
  // The same read + the directory feed the "more to explore" rail, so a visitor
  // who lands on one profile has somewhere to go next instead of a dead end.
  const [visitsMap, allListings, board] = await Promise.all([getOutboundClicks(), getListedSites(), getActiveSites()]);
  // Also verified on the ranked board (Search Console)? Then point at its rank
  // instead of telling the visitor it isn't ranked.
  const onBoard = board.sites.some((s) => hostname(s.site_url).toLowerCase() === listing.host);

  // Spotlight state for the owner panel (paid, labelled; never affects rank).
  const spotlightLive = isSpotlighted(listing);
  const { slotsLeft, nextOpens } = spotlightAvailability(allListings);
  const checkout = listing.ownerVerified && !spotlightLive && slotsLeft > 0 ? spotlightCheckoutUrl(listing.host) : null;
  // Returned from checkout (?spotlight=success). Activation is asynchronous (the
  // payment webhook), so this confirms the payment rather than the slot.
  const returnStatus = (sp.status ?? "").toLowerCase();
  const returnedFromCheckout = sp.spotlight === "success";
  const checkoutFailed = returnedFromCheckout && returnStatus !== "" && returnStatus !== "succeeded" && returnStatus !== "success";
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
      <SoftwareApplicationJsonLd
        name={listing.displayName}
        description={listing.description}
        siteUrl={listing.siteUrl}
        profileUrl={`${siteConfig.url}/listed/${listing.host}`}
        category={listing.category}
        pricing={listing.pricing}
        platforms={listing.platforms}
      />
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Directory", href: "/listed" },
          { name: listing.displayName },
        ]}
      />

      {returnedFromCheckout &&
        (checkoutFailed ? (
          <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
            <p>
              <span className="font-semibold">Your payment didn&apos;t go through.</span> No charge was made — you can
              try again from the Spotlight section below.
            </p>
          </div>
        ) : (
          <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
            <p>
              <span className="font-semibold">Payment received — thank you!</span>{" "}
              {spotlightLive
                ? `${listing.displayName} is spotlighted until ${shortDate(listing.spotlightUntil!)}.`
                : `Your ${SPOTLIGHT.days}-day Spotlight starts within a minute — refresh to see it.`}{" "}
              Questions? <a className="underline" href={`mailto:${siteConfig.email.support}`}>{siteConfig.email.support}</a>
            </p>
          </div>
        ))}

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

      {/* Structured fields — pricing + platforms as pills, then free-form details. */}
      {(listing.pricing || listing.platforms.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {listing.pricing && (
            <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium">
              {PRICING_LABELS[listing.pricing] ?? listing.pricing}
            </span>
          )}
          {listing.platforms.map((p) => (
            <span key={p} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {PLATFORM_LABELS[p] ?? p}
            </span>
          ))}
        </div>
      )}
      {listing.details && (
        <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{listing.details}</p>
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

      {/* Owner panel. Returning owners are the warmest lead on the site, so the
          claim path is a real call-to-action, not a footnote; sharing sits
          beside it because owners are also the likeliest sharers. */}
      <div className="mt-6 grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <div>
          <p className="font-medium">Own {listing.host}?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Claim it to edit your description, pricing and details, and keep your listing current.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href={`/listed/${listing.host}/edit`}>Claim &amp; edit this listing</Link>
          </Button>
        </div>
        <div>
          <p className="font-medium">Share this listing</p>
          <p className="mt-1 text-sm text-muted-foreground">Every share is a backlink and a few more visitors.</p>
          <ShareListing url={`${siteConfig.url}/listed/${listing.host}`} name={listing.displayName} className="mt-3" stacked />
        </div>

        {/* Spotlight — money buys labelled visibility, never a rank. */}
        <div id="spotlight" className="scroll-mt-24 border-t border-border/60 pt-4 sm:col-span-2">
          <p className="inline-flex items-center gap-1.5 font-medium">
            <Sparkles className="size-4 text-primary" /> Spotlight
          </p>
          {spotlightLive ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Spotlighted until <span className="font-medium text-foreground">{shortDate(listing.spotlightUntil!)}</span>.
              The owner can see the clicks it sent on the{" "}
              <Link href={`/listed/${listing.host}/edit`} className="text-primary hover:underline">
                listing&apos;s edit page
              </Link>
              .
            </p>
          ) : !listing.ownerVerified ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Verify ownership with the badge below to unlock Spotlight: {SPOTLIGHT.days} days at the top of the
              directory for {SPOTLIGHT.price}, labelled &ldquo;Sponsored&rdquo; and never affecting rank.
            </p>
          ) : slotsLeft === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              All {SPOTLIGHT.slots} Spotlight slots are taken
              {nextOpens ? ` — the next one opens ${shortDate(nextOpens)}` : ""}. Check back then.
            </p>
          ) : (
            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Put {listing.displayName} at the top of the directory, its category page and the homepage for{" "}
                {SPOTLIGHT.days} days. Labelled &ldquo;Sponsored&rdquo;, never affects rank, and you&apos;ll see the
                clicks it sends. {slotsLeft} of {SPOTLIGHT.slots} slots open.
              </p>
              {checkout ? (
                <Button asChild size="sm" className="shrink-0">
                  <TrackedLink event="spotlight_checkout_click" label={listing.host} href={checkout}>
                    Spotlight for {SPOTLIGHT.price}
                  </TrackedLink>
                </Button>
              ) : (
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <TrackedLink
                    event="spotlight_contact_click"
                    label={listing.host}
                    href={`mailto:${siteConfig.email.sponsors}?subject=${encodeURIComponent(`Spotlight: ${listing.host}`)}`}
                  >
                    Request a Spotlight
                  </TrackedLink>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Verifying means adding the badge to your own site, which means leaving
          the submit page and shipping a change — so the panel has to be here
          too, or an owner who comes back can never finish. The host is in the
          URL and the badge check is server-side, so nothing is granted here. */}
      {!listing.ownerVerified && (
        <div id="verify" className="mt-8 scroll-mt-24">
          <VerifyListing host={listing.host} />
        </div>
      )}

      {/* A listing isn't a ranked spot — make the difference (and the path to a
          real rank) explicit. Copy adapts to whether the owner has verified. */}
      {onBoard ? (
        <div className="mt-10 rounded-xl border border-primary/40 bg-primary/[0.05] p-6 text-center">
          <ShieldCheck className="mx-auto size-6 text-primary" />
          <p className="mt-2 font-medium">Also ranked on the verified leaderboard.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {listing.displayName} connected Google Search Console, so its organic clicks are verified and it has a
            real momentum rank.
          </p>
          <div className="mt-4 flex items-center justify-center">
            <Button asChild>
              <Link href={`/site/${listing.host}`}>See its verified rank</Link>
            </Button>
          </div>
        </div>
      ) : (
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
            <Link href="/login">Get a verified rank — free</Link>
          </Button>
        </div>
      </div>
      )}

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
