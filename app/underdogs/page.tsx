import type { Metadata } from "next";
import Link from "next/link";
import { Swords, ShieldCheck, TrendingUp, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SiteFavicon } from "@/components/site-favicon";
import { Sparkline } from "@/components/sparkline";
import { getUnderdogs, attachSparklines, UNDERDOG_DR_CAP } from "@/lib/data";
import { siteConfig, categoryLabel } from "@/lib/config";
import { formatCompact, formatGrowth, hostname, siteHref } from "@/lib/utils";
import type { RankedSite } from "@/lib/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Underdogs — Sites Punching Above Their Domain Rating",
  description:
    "Low-authority domains outranking the giants on verified Google Search Console clicks. Domain Rating is only context here — the board still ranks on real organic momentum, not authority.",
  alternates: { canonical: "/underdogs" },
  openGraph: {
    title: "Underdogs — Punching Above Their Domain Rating",
    description:
      "Small domains beating big ones on verified organic momentum, not authority scores.",
    url: `${siteConfig.url}/underdogs`,
  },
};

export default async function UnderdogsPage() {
  const data = await getUnderdogs(12);
  const underdogs = (
    data.underdogs.length ? await attachSparklines(data.underdogs) : []
  ) as RankedSite[];

  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-14 text-center sm:py-20">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground">
            <Swords className="size-4 text-primary" /> Punching above their weight
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Small domains beating the giants
          </h1>
          <p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
            Low Domain Rating, outsized organic momentum. These sites rank on real
            Search Console clicks, not authority scores — so a fresh domain growing
            fast shows up right next to the incumbents.
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <Button asChild size="lg">
              <Link href="/login">Prove you&apos;re an underdog — connect Search Console</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Read-only access · free · DR is context, clicks are the rank
            </p>
          </div>
        </div>
      </section>

      <div className="container max-w-5xl space-y-10 py-12">
        {underdogs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
            <p className="text-lg font-medium">No underdogs to show yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              This board fills up as low-authority sites (DR {UNDERDOG_DR_CAP} or
              under) start racking up verified clicks. Connect Search Console and
              you could be the first to punch above your weight.
            </p>
            <Button asChild className="mt-5">
              <Link href="/login">Connect Search Console</Link>
            </Button>
          </div>
        ) : (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <Swords className="size-5 text-primary" />
              <h2 className="text-xl font-semibold tracking-tight">
                Overperforming their authority
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {underdogs.map((row) => (
                <UnderdogCard key={row.id} row={row} />
              ))}
            </div>
          </section>
        )}

        {/* What this means */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <Reason
              icon={<ShieldCheck className="size-5" />}
              title="Clicks are the rank"
              body="Every position is decided by verified Search Console clicks. Domain Rating never moves the ranking — it's shown only for context."
            />
            <Reason
              icon={<TrendingUp className="size-5" />}
              title="Momentum over authority"
              body="A DR 3 site growing fast can out-rank a DR 60 incumbent. That gap — high momentum, low authority — is exactly the underdog story."
            />
            <Reason
              icon={<Swords className="size-5" />}
              title="A fair fight"
              body="Big domains don't get to coast on old backlinks here. If a small site earns the clicks, it earns the spot."
            />
          </div>
          <div className="mt-6 flex flex-col items-center gap-2 border-t border-border/60 pt-6 text-center">
            <Button asChild>
              <Link href="/login">Rank your site</Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Connect Google Search Console (read-only) · about 30 seconds
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function UnderdogCard({ row }: { row: RankedSite }) {
  const host = hostname(row.siteUrl).toLowerCase();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <SiteFavicon url={row.siteUrl} name={row.displayName} />
        <div className="min-w-0">
          <Link href={`/site/${host}`} className="block truncate font-semibold hover:underline">
            {row.displayName}
          </Link>
          <span className="text-xs text-muted-foreground">{host}</span>
        </div>
        <div className="ml-auto text-right">
          <div className="flex items-baseline justify-end gap-1.5">
            <span className="text-lg font-bold tabular-nums">#{row.rank}</span>
            {row.rankDelta != null && row.rankDelta > 0 && (
              <span className="text-xs font-medium text-success">▲{row.rankDelta}</span>
            )}
          </div>
        </div>
      </div>

      {/* The underdog line: low DR, real rank. */}
      {row.domainRank != null && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            DR {row.domainRank.toFixed(1)}
          </span>{" "}
          authority, but ranked{" "}
          <span className="font-semibold text-foreground">#{row.rank}</span> on verified
          clicks.
        </p>
      )}

      <div className="flex items-end justify-between gap-3">
        <div className="flex gap-4">
          <Metric label="Momentum" value={row.momentumScore.toFixed(0)} />
          <Metric label="7d clicks" value={formatCompact(row.clicks7d)} />
          <Metric label="Growth" value={formatGrowth(row.growthRate)} />
        </div>
        {row.spark.length >= 3 && <Sparkline data={row.spark} width={80} height={26} />}
      </div>

      <div className="flex items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        {row.category && (
          <Badge variant="outline" className="shrink-0">
            {categoryLabel(row.category)}
          </Badge>
        )}
        <a
          href={siteHref(row.siteUrl)}
          target="_blank"
          rel="noopener nofollow"
          className="ml-auto inline-flex items-center gap-1 hover:text-foreground"
        >
          Visit <ArrowUpRight className="size-3" />
        </a>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Reason({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div>
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-3 font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
