import type { Metadata } from "next";
import Link from "next/link";
import { Flame, TrendingDown, TrendingUp, Sparkles, ArrowUpRight } from "lucide-react";
import { SiteFavicon } from "@/components/site-favicon";
import { Button } from "@/components/ui/button";
import { getMovers } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { cn, formatGrowth, hostname, timeAgo } from "@/lib/utils";
import type { RankedSite } from "@/lib/types";

// Refreshes hourly with the board; the "this week" story is always current.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Movers & Shakers — This Week's Fastest-Climbing Websites",
  description:
    "The biggest weekly climbers on RealRank's organic-momentum leaderboard — verified by Google Search Console, ranked by real growth, not estimates. See who's heating up.",
  alternates: { canonical: "/movers" },
};

function siteProfileHref(s: RankedSite): string {
  return `/site/${hostname(s.siteUrl).toLowerCase()}`;
}

export default async function MoversPage() {
  const movers = await getMovers(12);
  const top = movers.climbers[0];

  // Pre-written share copy — turn the ranking into the next post.
  const shareText = top
    ? `📈 ${top.displayName} is this week's biggest climber on @realrank — up ${top.rankDelta} spots to #${top.rank} on real organic momentum (verified by Google Search Console, not estimates).`
    : `📈 This week's fastest-climbing websites on RealRank — ranked by verified organic momentum, not estimates.`;
  const shareUrl = `${siteConfig.url}/movers`;
  const xIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-14 text-center sm:py-20">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Flame className="size-3.5 text-primary" />
            Updated {movers.weekOf ? timeAgo(movers.weekOf) : "weekly"}
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Movers &amp; Shakers
          </h1>
          <p className="mt-4 max-w-2xl text-balance text-muted-foreground">
            This week&apos;s biggest climbers on the organic-momentum board — verified
            by Google Search Console, ranked by real growth. No bidding, no estimates.
          </p>
          {top && top.rankDelta && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={xIntent}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Share this week&apos;s movers <ArrowUpRight className="size-4" />
              </a>
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Connect &amp; climb</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="container max-w-3xl space-y-12 py-12">
        {movers.climbers.length === 0 && movers.newcomers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-lg font-medium">No movement yet this week</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Rankings refresh from Search Console every {siteConfig.refreshCadenceHours} hours.
              Check back after the next update — or{" "}
              <Link href="/login" className="text-primary hover:underline">
                connect your site
              </Link>{" "}
              and be the first to climb.
            </p>
          </div>
        ) : (
          <>
            {/* Climbers */}
            {movers.climbers.length > 0 && (
              <section>
                <SectionHeading
                  icon={<TrendingUp className="size-5" />}
                  title="Biggest climbers"
                  subtitle="Most positions gained since the last refresh."
                />
                <ol className="mt-5 space-y-2">
                  {movers.climbers.map((s, i) => (
                    <MoverRow key={s.id} site={s} highlight={i === 0} tone="up" />
                  ))}
                </ol>
              </section>
            )}

            {/* New this week */}
            {movers.newcomers.length > 0 && (
              <section>
                <SectionHeading
                  icon={<Sparkles className="size-5" />}
                  title="New this week"
                  subtitle="Sites that just earned a spot on the board."
                />
                <ol className="mt-5 space-y-2">
                  {movers.newcomers.map((s) => (
                    <MoverRow key={s.id} site={s} tone="new" />
                  ))}
                </ol>
              </section>
            )}

            {/* Cooling off */}
            {movers.fallers.length > 0 && (
              <section>
                <SectionHeading
                  icon={<TrendingDown className="size-5" />}
                  title="Cooling off"
                  subtitle="Momentum slowed relative to the pack — a chance to climb back."
                />
                <ol className="mt-5 space-y-2">
                  {movers.fallers.map((s) => (
                    <MoverRow key={s.id} site={s} tone="down" />
                  ))}
                </ol>
              </section>
            )}
          </>
        )}

        {/* Conversion band */}
        <section className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Want to be next week&apos;s top climber?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            The board is still small — connect Google Search Console, publish your
            verified traffic, and let real momentum move you up. It&apos;s free.
          </p>
          <Button asChild className="mt-5">
            <Link href="/login">Connect Search Console</Link>
          </Button>
        </section>
      </div>
    </>
  );
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function MoverRow({
  site,
  highlight = false,
  tone,
}: {
  site: RankedSite;
  highlight?: boolean;
  tone: "up" | "down" | "new";
}) {
  const delta = site.rankDelta;
  return (
    <li>
      <Link
        href={siteProfileHref(site)}
        className={cn(
          "group flex items-center gap-3 rounded-xl border p-3 transition-colors sm:gap-4 sm:p-4",
          highlight
            ? "border-primary/40 bg-primary/5 hover:border-primary/60"
            : "border-border bg-card hover:border-primary/40",
        )}
      >
        <span className="w-8 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
          #{site.rank}
        </span>
        <SiteFavicon url={site.siteUrl} name={site.displayName} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium group-hover:text-primary">
            {site.displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {hostname(site.siteUrl)} · {formatGrowth(site.growthRate)} growth
          </p>
        </div>
        <DeltaTag delta={delta} tone={tone} />
      </Link>
    </li>
  );
}

function DeltaTag({ delta, tone }: { delta: number | null; tone: "up" | "down" | "new" }) {
  if (tone === "new") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
        <Sparkles className="size-3.5" /> New
      </span>
    );
  }
  if (delta === null) return null;
  if (tone === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-semibold tabular-nums text-primary">
        <TrendingUp className="size-3.5" />+{delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm font-semibold tabular-nums text-muted-foreground">
      <TrendingDown className="size-3.5" />
      {delta}
    </span>
  );
}
