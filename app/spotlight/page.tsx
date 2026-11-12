import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Search, BadgeCheck, CheckCircle2, Clock, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFavicon } from "@/components/site-favicon";
import { TrackedLink } from "@/components/tracked-link";
import { getListedSites, normalizeHost, type Listing } from "@/lib/listed";
import { SPOTLIGHT, activeSpotlights, isSpotlighted, spotlightAvailability, spotlightCheckoutUrl, shortDate } from "@/lib/spotlight";
import { siteConfig } from "@/lib/config";

type SearchParams = Promise<{ host?: string }>;

export const metadata: Metadata = {
  title: "Book a Spotlight",
  description: `Put your owner-verified listing at the top of the ${siteConfig.name} directory, its category page and the homepage for ${SPOTLIGHT.days} days — ${SPOTLIGHT.price}, clearly labelled, never affecting rank.`,
  alternates: { canonical: "/spotlight" },
};

/**
 * The one place to book a Spotlight. Type your domain and get the exact next
 * step for that listing — pay, verify first, list first, or wait for a slot —
 * instead of being sent around the site to find your own listing page.
 * Server-rendered from ?host=, so it works without client JS.
 */
export default async function SpotlightPage({ searchParams }: { searchParams: SearchParams }) {
  const { host: rawHost } = await searchParams;
  const all = await getListedSites();
  const { slotsLeft, nextOpens } = spotlightAvailability(all);
  const live = activeSpotlights(all);

  const query = (rawHost ?? "").trim();
  const host = query ? normalizeHost(query) : null;
  const listing = host ? (all.find((l) => l.host === host) ?? null) : null;

  return (
    <div className="container max-w-2xl py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Spotlight · {SPOTLIGHT.price} for {SPOTLIGHT.days} days
        </span>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Book a Spotlight</h1>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          Your listing at the top of the directory, its category page and the homepage for {SPOTLIGHT.days} days.
          Labelled &ldquo;Sponsored&rdquo;, never affects rank, and you see the clicks it sends.
        </p>
        <p className="mt-3 text-sm">
          <SlotsLine slotsLeft={slotsLeft} nextOpens={nextOpens} />
        </p>
      </div>

      {/* Step 1 — find the listing. A plain GET form: ?host=… re-renders this page. */}
      <form action="/spotlight" method="get" className="mt-8 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="spotlight-host" className="sr-only">
          Your website
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="spotlight-host"
            name="host"
            defaultValue={query}
            placeholder="yourproject.com"
            autoComplete="url"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            required
            className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/50"
          />
        </div>
        <Button type="submit" size="lg" className="h-11">
          Find my listing
        </Button>
      </form>

      {/* Step 2 — the exact next step for that listing. */}
      {query && (
        <div className="mt-5" aria-live="polite">
          {!host ? (
            <Result tone="muted" title="That doesn't look like a website address">
              Try the domain on its own, like <code>yourproject.com</code>.
            </Result>
          ) : !listing ? (
            <Result tone="muted" icon={<Plus className="size-5 text-primary" />} title={`${host} isn't listed yet`}>
              <p>Listing is free and takes a minute. Add the badge while you're there to verify ownership — then come back to book.</p>
              <Button asChild className="mt-3">
                <Link href="/submit">List {host} free</Link>
              </Button>
            </Result>
          ) : (
            <ListingResult listing={listing} slotsLeft={slotsLeft} nextOpens={nextOpens} />
          )}
        </div>
      )}

      {/* How it works — the rule, stated where the money changes hands. */}
      <ol className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { t: "Verify ownership", b: "Add the RealRank badge to your site. Only owner-verified listings can be spotlighted." },
          { t: "Pay once", b: `${SPOTLIGHT.price} for ${SPOTLIGHT.days} days. No subscription, no auto-renew.` },
          { t: "Go live", b: "Your listing appears in the Spotlight lane as soon as the payment clears." },
        ].map((s, i) => (
          <li key={s.t} className="rounded-xl border border-border bg-card p-4">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-semibold text-primary">
              {i + 1}
            </span>
            <p className="mt-3 font-medium">{s.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.b}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        Money buys labelled visibility on {siteConfig.name} — never a rank, a verified mark, or a followed link.
        Sponsored links carry rel=&quot;sponsored&quot;.{" "}
        <Link href="/pricing#spotlight" className="text-primary hover:underline">
          Pricing &amp; FAQ
        </Link>
      </p>

      {live.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold">Spotlighted right now</h2>
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            {live.map((l) => (
              <li key={l.host} className="flex items-center gap-3 px-4 py-3 text-sm">
                <SiteFavicon url={l.siteUrl} name={l.displayName} size={20} />
                <Link href={`/listed/${l.host}`} className="font-medium hover:underline">
                  {l.displayName}
                </Link>
                <span className="ml-auto text-xs text-muted-foreground">until {shortDate(l.spotlightUntil!)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SlotsLine({ slotsLeft, nextOpens }: { slotsLeft: number; nextOpens: string | null }) {
  if (slotsLeft > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-success">
        <span className="size-2 rounded-full bg-success" />
        {slotsLeft} of {SPOTLIGHT.slots} slots open now
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Clock className="size-4" />
      All {SPOTLIGHT.slots} slots taken{nextOpens ? ` — the next opens ${shortDate(nextOpens)}` : ""}
    </span>
  );
}

function ListingResult({
  listing,
  slotsLeft,
  nextOpens,
}: {
  listing: Listing;
  slotsLeft: number;
  nextOpens: string | null;
}) {
  const head = (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background">
        <SiteFavicon url={listing.siteUrl} name={listing.displayName} size={28} />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate font-semibold">
          {listing.displayName}
          {listing.ownerVerified && <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified owner" />}
        </p>
        <Link href={`/listed/${listing.host}`} className="text-xs text-muted-foreground hover:underline">
          {listing.host}
        </Link>
      </div>
    </div>
  );

  if (isSpotlighted(listing)) {
    return (
      <Result tone="success" icon={<CheckCircle2 className="size-5 text-success" />} title="Already spotlighted">
        {head}
        <p className="mt-3">
          Live until <strong>{shortDate(listing.spotlightUntil!)}</strong>. See the clicks it&apos;s sending on the{" "}
          <Link href={`/listed/${listing.host}/edit`} className="text-primary hover:underline">
            listing&apos;s edit page
          </Link>
          .
        </p>
      </Result>
    );
  }

  if (!listing.ownerVerified) {
    return (
      <Result tone="muted" icon={<BadgeCheck className="size-5 text-primary" />} title="Verify ownership first">
        {head}
        <p className="mt-3">
          Spotlight is only for owner-verified listings. Add the {siteConfig.name} badge to {listing.host}, then
          check it from your listing page — it takes a couple of minutes. Come back here once the ✓ shows.
        </p>
        <Button asChild className="mt-3">
          <Link href={`/listed/${listing.host}#verify`}>Verify {listing.host}</Link>
        </Button>
      </Result>
    );
  }

  if (slotsLeft === 0) {
    return (
      <Result tone="muted" icon={<Clock className="size-5 text-muted-foreground" />} title="All slots are taken">
        {head}
        <p className="mt-3">
          {listing.displayName} is eligible. All {SPOTLIGHT.slots} slots are booked
          {nextOpens ? ` — the next opens ${shortDate(nextOpens)}` : ""}. Check back then.
        </p>
      </Result>
    );
  }

  const checkout = spotlightCheckoutUrl(listing.host);
  return (
    <Result tone="primary" icon={<Sparkles className="size-5 text-primary" />} title="Ready to book">
      {head}
      <p className="mt-3">
        {SPOTLIGHT.days} days in the Spotlight lane for {SPOTLIGHT.price}, starting as soon as the payment clears.
        You&apos;ll come back to your listing page with a confirmation.
      </p>
      {checkout ? (
        <Button asChild size="lg" className="mt-4 w-full sm:w-auto">
          <TrackedLink event="spotlight_checkout_click" label={listing.host} href={checkout}>
            Pay {SPOTLIGHT.price} &amp; book {listing.displayName}
          </TrackedLink>
        </Button>
      ) : (
        <Button asChild size="lg" variant="outline" className="mt-4 w-full sm:w-auto">
          <TrackedLink
            event="spotlight_contact_click"
            label={listing.host}
            href={`mailto:${siteConfig.email.sponsors}?subject=${encodeURIComponent(`Spotlight: ${listing.host}`)}`}
          >
            Request a Spotlight
          </TrackedLink>
        </Button>
      )}
    </Result>
  );
}

function Result({
  tone,
  icon,
  title,
  children,
}: {
  tone: "primary" | "success" | "muted";
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === "primary"
          ? "rounded-xl border border-primary/40 bg-primary/5 p-5"
          : tone === "success"
            ? "rounded-xl border border-success/30 bg-success/10 p-5"
            : "rounded-xl border border-border bg-card p-5"
      }
    >
      <p className="mb-3 inline-flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </p>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
