import Link from "next/link";
import { Sparkles, TrendingUp, Plus } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { SiteFavicon } from "@/components/site-favicon";
import { SPOTLIGHT } from "@/lib/spotlight";
import { siteSlug } from "@/lib/site";
import { formatGrowth, formatCompact, cn } from "@/lib/utils";
import type { Listing } from "@/lib/listed";
import type { RankedSite } from "@/lib/types";

/**
 * The Spotlight lane: paid visibility next to earned visibility, both labelled.
 *
 *  - Earned: the fastest-growing verified site this week (the momentum board's
 *    #1 — last 7 days vs the prior 21), free, because it grew.
 *  - Paid: owner-verified listings that booked a Spotlight, marked "Sponsored",
 *    with rel="sponsored" links.
 *  - An open-slot card while slots remain, so the offer is discoverable.
 *
 * It sits above the directory grid, never inside the ranked leaderboard, and
 * nothing here touches anyone's momentum score.
 */
export function SpotlightLane({
  spotlights,
  mover,
  visits,
  slotsLeft,
  className,
}: {
  spotlights: Listing[];
  mover?: RankedSite | null;
  visits?: Map<string, number>;
  slotsLeft: number;
  className?: string;
}) {
  if (spotlights.length === 0 && !mover && slotsLeft === 0) return null;

  return (
    <section aria-labelledby="spotlight-heading" className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="spotlight-heading" className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" /> Spotlight
        </h2>
        <p className="text-xs text-muted-foreground">
          Sponsored spots are labelled and never affect rank ·{" "}
          <Link href="/pricing#spotlight" className="text-primary hover:underline">
            How it works
          </Link>
        </p>
      </div>
      <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {mover && <MoverCard site={mover} />}
        {spotlights.map((l, i) => (
          <ListingCard key={l.host} listing={l} visits={visits?.get(l.host) ?? 0} sponsored priority={i < 2} />
        ))}
        {slotsLeft > 0 && <OpenSlotCard />}
      </ul>
    </section>
  );
}

/** Earned spot: the week's fastest-growing verified site. Free — it grew. */
function MoverCard({ site }: { site: RankedSite }) {
  return (
    <li className="relative flex flex-col justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <Link href={`/site/${siteSlug(site.siteUrl)}`} aria-label={`${site.displayName} on RealRank`} className="absolute inset-0 z-0" />
      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
        <TrendingUp className="size-3" /> Mover of the week · earned
      </span>
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background">
          <SiteFavicon url={site.siteUrl} name={site.displayName} size={32} />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold">{site.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{siteSlug(site.siteUrl)}</p>
        </div>
      </div>
      <p className="text-sm">
        <span className="font-semibold text-success">{formatGrowth(site.growthRate)}</span>{" "}
        <span className="text-muted-foreground">
          organic clicks this week · {formatCompact(site.clicks7d)} verified clicks
        </span>
      </p>
      <p className="text-xs text-muted-foreground">
        Earned, not bought: the fastest-growing verified site on RealRank this week.
      </p>
    </li>
  );
}

/** Open-slot card — makes the offer discoverable without pretending it's content. */
function OpenSlotCard() {
  return (
    <li className="hidden flex-col justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm sm:flex">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <Plus className="size-4 text-primary" /> Spotlight slot open
      </span>
      <p className="text-muted-foreground">
        Owner-verified projects can take this spot for {SPOTLIGHT.days} days — {SPOTLIGHT.price}, labelled, with
        results you can check.
      </p>
      <Link href="/spotlight" className="text-sm font-medium text-primary hover:underline">
        Book a Spotlight →
      </Link>
    </li>
  );
}
