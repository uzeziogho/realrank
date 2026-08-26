import Link from "next/link";
import { ArrowUpRight, TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatCompact, formatGrowth, hostname, siteHref } from "@/lib/utils";
import { categoryLabel, type RankingView } from "@/lib/config";
import type { LeaderboardRow, RankedSite, SponsoredRow } from "@/lib/types";

export function Leaderboard({
  rows,
  view,
}: {
  rows: LeaderboardRow[];
  view: RankingView;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Column header — hidden on mobile where rows stack */}
      <div className="hidden grid-cols-[3.5rem_1fr_7rem_7rem] items-center gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <span>#</span>
        <span>Site</span>
        <span className="text-right">
          {view === "momentum" ? "Momentum" : "28-day"}
        </span>
        <span className="text-right">
          {view === "momentum" ? "7-day clicks" : "Momentum"}
        </span>
      </div>

      <ol className="divide-y divide-border">
        {rows.map((row) =>
          row.kind === "organic" ? (
            <OrganicRowItem key={row.id} row={row} view={view} />
          ) : (
            <SponsoredRowItem key={row.id} row={row} />
          ),
        )}
      </ol>
    </div>
  );
}

function OrganicRowItem({ row, view }: { row: RankedSite; view: RankingView }) {
  const primary =
    view === "momentum" ? formatCompact(row.clicks7d) : formatCompact(row.clicks28d);
  const primaryLabel = view === "momentum" ? "7d clicks" : "28d clicks";

  return (
    <li className="group grid grid-cols-[2.5rem_1fr] items-center gap-4 px-4 py-4 transition-colors hover:bg-accent/40 md:grid-cols-[3.5rem_1fr_7rem_7rem] md:px-5">
      {/* Rank + movement */}
      <div className="flex flex-col items-start">
        <span
          className={cn(
            "tabular-nums font-semibold",
            row.rank <= 3 ? "text-2xl text-foreground" : "text-lg text-muted-foreground",
          )}
        >
          {row.rank}
        </span>
        <RankDelta delta={row.rankDelta} />
      </div>

      {/* Site identity */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={siteHref(row.siteUrl)}
            target="_blank"
            rel="noopener nofollow"
            className="truncate text-base font-semibold text-foreground hover:underline"
          >
            {row.displayName}
          </a>
          <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          {row.category && (
            <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
              {categoryLabel(row.category)}
            </Badge>
          )}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          <span className="text-muted-foreground/70">{hostname(row.siteUrl)}</span>
          {row.description ? <span className="mx-1.5">·</span> : null}
          {row.description}
        </p>
        {/* Mobile metrics */}
        <div className="mt-2 flex items-center gap-3 md:hidden">
          <GrowthPill ratio={row.growthRate} />
          <span className="text-sm tabular-nums text-muted-foreground">
            {primary} <span className="text-xs">{primaryLabel}</span>
          </span>
        </div>
      </div>

      {/* Primary metric column (desktop) */}
      <div className="hidden flex-col items-end md:flex">
        {view === "momentum" ? (
          <>
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {row.momentumScore.toFixed(0)}
            </span>
            <GrowthPill ratio={row.growthRate} />
          </>
        ) : (
          <span className="text-xl font-semibold tabular-nums text-foreground">
            {formatCompact(row.clicks28d)}
          </span>
        )}
      </div>

      {/* Secondary metric column (desktop) */}
      <div className="hidden flex-col items-end md:flex">
        {view === "momentum" ? (
          <span className="text-xl font-semibold tabular-nums text-foreground">
            {formatCompact(row.clicks7d)}
          </span>
        ) : (
          <>
            <span className="text-xl font-semibold tabular-nums text-foreground">
              {row.momentumScore.toFixed(0)}
            </span>
            <GrowthPill ratio={row.growthRate} />
          </>
        )}
      </div>
    </li>
  );
}

function SponsoredRowItem({ row }: { row: SponsoredRow }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] items-center gap-4 bg-amber-500/[0.06] px-4 py-4 md:grid-cols-[3.5rem_1fr_7rem_7rem] md:px-5">
      <div className="flex items-center justify-center">
        <span className="text-xs font-medium text-amber-500/70">Ad</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <a
            href={row.siteUrl}
            target="_blank"
            rel="noopener nofollow sponsored"
            className="truncate text-base font-semibold text-foreground hover:underline"
          >
            {row.displayName}
          </a>
          <Badge variant="sponsored" className="shrink-0">
            Sponsored
          </Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground">{row.description}</p>
      </div>
      <div className="col-span-2 md:col-span-2 md:col-start-3 md:flex md:items-center md:justify-end">
        <a
          href={row.siteUrl}
          target="_blank"
          rel="noopener nofollow sponsored"
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-500/30 px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/10 md:mt-0"
        >
          {row.ctaLabel ?? "Learn more"}
          <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </li>
  );
}

function RankDelta({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
        New
      </span>
    );
  }
  if (delta === 0) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums",
        up ? "text-success" : "text-danger",
      )}
      title={`${up ? "Up" : "Down"} ${Math.abs(delta)} since last refresh`}
    >
      {up ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      {Math.abs(delta)}
    </span>
  );
}

function GrowthPill({ ratio }: { ratio: number }) {
  const positive = ratio > 0.005;
  const negative = ratio < -0.005;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
        positive && "text-success",
        negative && "text-danger",
        !positive && !negative && "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {formatGrowth(ratio)}
    </span>
  );
}
