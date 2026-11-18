import type { Metadata } from "next";
import Link from "next/link";
import { Eye } from "lucide-react";
import { RankPreview } from "@/components/rank-preview";
import { getLeaderboardData } from "@/lib/data";
import { siteSlug } from "@/lib/site";
import { siteConfig } from "@/lib/config";
import type { BoardEntry } from "@/lib/gsc-export";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Where would my site rank? — preview from a Search Console export",
  description: `Drop your Google Search Console export and see where your site would rank on the ${siteConfig.name} leaderboard — private, read on your device, no login.`,
  alternates: { canonical: "/rank-preview" },
};

/**
 * The lighter first step before OAuth: see your would-be rank from an export,
 * then connect to make it official. The board travels to the browser as plain
 * numbers so the comparison happens there, next to the file.
 */
export default async function RankPreviewPage() {
  const data = await getLeaderboardData("momentum").catch(() => null);
  const board: BoardEntry[] = (data?.organic ?? [])
    .filter((s) => !s.pending)
    .map((s) => ({ name: s.displayName, slug: siteSlug(s.siteUrl), score: s.momentumScore, clicks7d: s.clicks7d, clicks28d: s.clicks28d }));

  return (
    <div className="container max-w-2xl py-12">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Eye className="size-3.5 text-primary" /> Free · private · no login
        </span>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Where would your site rank?</h1>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          Drop your Search Console export and see your place on today&apos;s board — against {board.length} verified
          {board.length === 1 ? " site" : " sites"} — before connecting anything.
        </p>
      </div>

      <div className="mt-8">
        <RankPreview board={board} />
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-card p-5 text-sm">
        <p className="font-semibold">How to get your export (1 minute)</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted-foreground">
          <li>
            Open{" "}
            <a
              href="https://search.google.com/search-console/performance/search-analytics"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Search Console → Performance
            </a>{" "}
            and pick your site.
          </li>
          <li>Set the date range to <span className="text-foreground">Last 3 months</span>.</li>
          <li>Click <span className="text-foreground">Export → Download CSV</span> (top right).</li>
          <li>Drop the downloaded zip above — or unzip it and drop <span className="text-foreground">Chart.csv</span>.</li>
        </ol>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already sure? <Link href="/login" className="text-primary hover:underline">Connect Search Console</Link> and
        you&apos;re ranked straight away from your last 28 days. Prefer typing two numbers?{" "}
        <Link href="/momentum-score" className="text-primary hover:underline">Momentum calculator</Link>.
      </p>
    </div>
  );
}
