import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Prose } from "@/components/prose";
import { getMonthSnapshot, getSnapshotMonths, SNAPSHOT_TOP_N, type MonthSnapshot } from "@/lib/monthly";
import { categoryLabel, siteConfig } from "@/lib/config";
import { cn, formatCompact, formatGrowth } from "@/lib/utils";

/**
 * A frozen monthly ranking: /best/fastest-growing/2026-10. One page per
 * completed month, so the archive grows by itself and each page can rank for
 * the month people search ("fastest growing websites October 2026").
 */

export async function monthSnapshotMetadata(month: string): Promise<Metadata> {
  const snap = await getMonthSnapshot(month);
  if (!snap) return { title: "Not found", robots: { index: false, follow: false } };
  const title = `Fastest-growing websites of ${snap.label} (verified)`;
  const leader = snap.entries[0];
  const description = leader
    ? `The ${Math.min(SNAPSHOT_TOP_N, snap.entries.length)} fastest-growing websites of ${snap.label}, ranked by verified Google Search Console clicks. #1: ${leader.name} (${formatGrowth(leader.growthRate)} vs ${snap.prevLabel}).`
    : `The fastest-growing websites of ${snap.label}, ranked by verified Google Search Console clicks.`;
  return {
    title,
    description,
    alternates: { canonical: `/best/fastest-growing/${month}` },
    openGraph: { title, description, url: `${siteConfig.url}/best/fastest-growing/${month}` },
    ...(snap.indexable ? {} : { robots: { index: false, follow: true } }),
  };
}

/** A few lines written from the month's own numbers, so each page says something new. */
function highlights(snap: MonthSnapshot): string[] {
  const [first, second, third] = snap.entries;
  const out: string[] = [];
  if (first) {
    out.push(
      `${first.name} was the fastest-growing site of ${snap.label}: ${formatCompact(first.clicks)} organic clicks, ${formatGrowth(first.growthRate)} on ${snap.prevLabel}'s daily rate.`,
    );
  }
  if (second && third) out.push(`${second.name} and ${third.name} completed the top three.`);
  const biggest = [...snap.entries].sort((a, b) => b.clicks - a.clicks)[0];
  if (biggest && biggest.id !== first?.id) {
    out.push(`The biggest site by volume was ${biggest.name}, with ${formatCompact(biggest.clicks)} clicks (#${biggest.rank} on momentum).`);
  }
  if (snap.entries.length > 0) {
    const change = snap.prevTotalClicks > 0 ? (snap.totalClicks - snap.prevTotalClicks) / snap.prevTotalClicks : null;
    out.push(
      `${snap.growing} of ${snap.entries.length} verified sites grew${
        change !== null ? `, and their combined organic clicks moved ${formatGrowth(change)} month over month` : ""
      }.`,
    );
  }
  return out;
}

export async function MonthSnapshotPage({ month }: { month: string }) {
  const snap = await getMonthSnapshot(month);
  if (!snap) notFound();
  const months = await getSnapshotMonths();
  // Months are newest first; "YYYY-MM" strings compare in date order.
  const older = months.find((m) => m.month < month) ?? null;
  const newer = [...months].reverse().find((m) => m.month > month) ?? null;
  const top = snap.entries.slice(0, SNAPSHOT_TOP_N);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Fastest-growing websites of ${snap.label}`,
    numberOfItems: top.length,
    itemListElement: top.map((e) => ({
      "@type": "ListItem",
      position: e.rank,
      name: e.name,
      url: `${siteConfig.url}/site/${e.slug}`,
    })),
  };

  return (
    <div className="container max-w-4xl py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />

      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <CalendarDays className="size-3.5" /> Monthly snapshot · {snap.label}
        </p>
        <h1 className="mt-2 text-balance text-4xl font-bold tracking-tight">The fastest-growing websites of {snap.label}</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Ranked by verified organic growth: each site&apos;s Google Search Console clicks in {snap.label} against{" "}
          {snap.prevLabel}, measured — not estimated — and weighted by volume so a real climb beats a lucky blip.
        </p>
      </div>

      {top.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          Not enough verified history for {snap.label} yet.{" "}
          <Link href="/best/fastest-growing" className="text-primary hover:underline">See who&apos;s growing right now</Link>.
        </div>
      ) : (
        <>
          <ul className="mt-6 max-w-3xl list-disc space-y-1.5 pl-5 text-muted-foreground">
            {highlights(snap).map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>

          <ol className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {top.map((e) => {
              const up = e.growthRate > 0.005;
              const down = e.growthRate < -0.005;
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4">
                  <span className="w-7 shrink-0 text-right font-mono text-sm tabular-nums text-muted-foreground">{e.rank}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/site/${e.slug}`} className="block truncate font-medium hover:underline">
                      {e.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.slug}
                      {e.category ? ` · ${categoryLabel(e.category)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
                        up ? "text-success" : down ? "text-danger" : "text-muted-foreground",
                      )}
                    >
                      {up ? <TrendingUp className="size-3.5" /> : down ? <TrendingDown className="size-3.5" /> : null}
                      {formatGrowth(e.growthRate)}
                    </p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {formatCompact(e.clicks)} clicks
                      <span className="hidden sm:inline"> · was {formatCompact(e.prevClicks)}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <nav className="mt-6 flex items-center justify-between gap-3 text-sm" aria-label="Other months">
        {older ? (
          <Link href={`/best/fastest-growing/${older.month}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
            <ArrowLeft className="size-4" /> {older.label}
          </Link>
        ) : (
          <span />
        )}
        {newer ? (
          <Link href={`/best/fastest-growing/${newer.month}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
            {newer.label} <ArrowRight className="size-4" />
          </Link>
        ) : (
          <Link href="/best/fastest-growing" className="inline-flex items-center gap-1.5 text-primary hover:underline">
            Growing right now <ArrowRight className="size-4" />
          </Link>
        )}
      </nav>

      <Prose className="mt-10 max-w-3xl">
        <h2>How this month was ranked</h2>
        <p>
          Every site here connected Google Search Console read-only, so its clicks are Google&apos;s own numbers. For
          each site we compare its average daily organic clicks in {snap.label} with {snap.prevLabel}, then weight that
          growth by the log of its monthly clicks — the same{" "}
          <Link href="/blog/momentum-score-explained">momentum formula</Link> as the live board, over calendar months
          instead of weeks. Sites without a full {snap.prevLabel} on record aren&apos;t ranked, so a new arrival
          can&apos;t look like a giant leap.
        </p>
        <p>
          This page is a snapshot. For who&apos;s growing this week, see the{" "}
          <Link href="/best/fastest-growing">live fastest-growing list</Link> or the{" "}
          <Link href="/leaderboard">full leaderboard</Link>.
        </p>
      </Prose>

      {months.length > 1 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">Every monthly snapshot</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {months.map((m) => (
              <li key={m.month}>
                <Link
                  href={`/best/fastest-growing/${m.month}`}
                  aria-current={m.month === month ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors",
                    m.month === month
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {m.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/login">Get your site on next month&apos;s list — free</Link>
        </Button>
      </div>
    </div>
  );
}
