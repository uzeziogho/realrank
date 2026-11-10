import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ClaimEdit } from "@/components/claim-edit";
import { getListingByHost, getListingClaimInfo, normalizeHost } from "@/lib/listed";
import { getOptionalUser } from "@/lib/auth";
import { getHostClicksBetween } from "@/lib/data";
import { shortDate } from "@/lib/spotlight";
import type { Listing } from "@/lib/listed";

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Honest Spotlight results: clicks RealRank sent during the run vs the same
 * number of days immediately before it. First-party counts — the same clicks
 * also land in the owner's own analytics tagged ref=realrank.lol.
 */
async function spotlightResults(listing: Listing) {
  if (!listing.spotlightStartedAt || !listing.spotlightUntil) return null;
  const start = Date.parse(listing.spotlightStartedAt);
  const until = Date.parse(listing.spotlightUntil);
  const end = Math.min(Date.now(), until);
  const days = Math.max(1, Math.ceil((end - start) / DAY_MS));
  const [during, before] = await Promise.all([
    getHostClicksBetween(listing.host, isoDay(start), isoDay(end)),
    getHostClicksBetween(listing.host, isoDay(start - days * DAY_MS), isoDay(start - DAY_MS)),
  ]);
  return { during, before, days, live: until > Date.now(), start, until };
}

export const metadata: Metadata = {
  title: "Claim & edit listing",
  robots: { index: false, follow: false },
};

type Params = Promise<{ host: string }>;

export default async function ClaimEditPage({ params }: { params: Params }) {
  const { host: raw } = await params;
  const host = normalizeHost(raw) ?? raw.toLowerCase();
  const listing = await getListingByHost(host);
  if (!listing) notFound();

  const user = await getOptionalUser();
  if (!user) redirect(`/login?next=/listed/${host}/edit`);

  const claim = await getListingClaimInfo(host);
  const isOwner = claim?.claimedBy === user.id;
  const results = isOwner ? await spotlightResults(listing) : null;

  return (
    <div className="container max-w-2xl py-12">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Directory", href: "/listed" },
          { name: listing.displayName, href: `/listed/${host}` },
          { name: isOwner ? "Edit" : "Claim" },
        ]}
      />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        {isOwner ? "Edit your listing" : "Claim this listing"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{host}</p>

      {results && (
        <section className="mt-6 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Spotlight results</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {results.live ? "Live" : "Ended"} · {shortDate(new Date(results.start).toISOString())} –{" "}
            {shortDate(new Date(results.until).toISOString())}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Clicks sent during Spotlight</p>
              <p className="text-2xl font-bold tabular-nums">{results.during}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">The {results.days} days before</p>
              <p className="text-2xl font-bold tabular-nums">{results.before}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Counted on RealRank. The same visits also show up in your own analytics, tagged{" "}
            <code className="rounded bg-muted px-1">ref=realrank.lol</code>.
          </p>
        </section>
      )}

      <div className="mt-6">
        <ClaimEdit listing={listing} isOwner={isOwner} />
      </div>
    </div>
  );
}
