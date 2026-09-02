import Link from "next/link";
import { ArrowUpRight, Flame, Sparkles, TrendingUp } from "lucide-react";
import { SiteFavicon } from "@/components/site-favicon";
import { cn, formatGrowth, hostname } from "@/lib/utils";
import type { RankedSite } from "@/lib/types";

/** Green "+N" pill for positions gained — the whole point of a mover. */
function GainChip({ delta, className }: { delta: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-sm font-semibold tabular-nums text-primary",
        className,
      )}
    >
      <TrendingUp className="size-3.5" />+{delta}
    </span>
  );
}

function moverHref(s: RankedSite): string {
  return `/site/${hostname(s.siteUrl).toLowerCase()}`;
}

/**
 * "Movers & Shakers" — this week's biggest climbers on the momentum board.
 * Built to be screenshot- and share-friendly: a bold headline, a featured
 * climber, and a compact chase pack. The ranking itself is the marketing.
 */
export function MoversBand({
  climbers,
  newcomers,
  seeAllHref = "/movers",
  compact = false,
}: {
  climbers: RankedSite[];
  newcomers: RankedSite[];
  seeAllHref?: string | null;
  compact?: boolean;
}) {
  if (climbers.length === 0 && newcomers.length === 0) return null;

  const [featured, ...rest] = climbers;
  const chase = compact ? rest.slice(0, 3) : rest;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Flame className="size-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Movers &amp; Shakers
            </h2>
            <p className="text-xs text-muted-foreground">
              Biggest climbers on the momentum board this week
            </p>
          </div>
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
          >
            See all <ArrowUpRight className="size-4" />
          </Link>
        )}
      </div>

      {/* Featured climber — the headline number people screenshot. */}
      {featured && featured.rankDelta && (
        <Link
          href={moverHref(featured)}
          className="group mt-5 flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/60"
        >
          <SiteFavicon url={featured.siteUrl} name={featured.displayName} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold group-hover:text-primary">
                {featured.displayName}
              </span>
              <GainChip delta={featured.rankDelta} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Now #{featured.rank} · {formatGrowth(featured.growthRate)} organic growth
            </p>
          </div>
          <span className="hidden text-right text-xs uppercase tracking-wider text-primary sm:block">
            Top
            <br />
            climber
          </span>
        </Link>
      )}

      {/* Chase pack */}
      {chase.length > 0 && (
        <ul className="mt-3 divide-y divide-border/70">
          {chase.map((s) => (
            <li key={s.id}>
              <Link
                href={moverHref(s)}
                className="group flex items-center gap-3 py-2.5"
              >
                <SiteFavicon url={s.siteUrl} name={s.displayName} size={24} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium group-hover:text-primary">
                  {s.displayName}
                </span>
                <span className="text-xs text-muted-foreground">#{s.rank}</span>
                {s.rankDelta ? <GainChip delta={s.rankDelta} /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* New this week */}
      {newcomers.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
          <span className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3.5" /> New this week
          </span>
          {newcomers.map((s) => (
            <Link
              key={s.id}
              href={moverHref(s)}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {s.displayName}
            </Link>
          ))}
        </div>
      )}

      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline sm:hidden"
        >
          See all movers <ArrowUpRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
