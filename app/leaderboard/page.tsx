import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LeaderboardSection } from "@/components/leaderboard-section";
import { getLeaderboardData } from "@/lib/data";
import { siteConfig, type RankingView } from "@/lib/config";

type SearchParams = Promise<{ view?: string; page?: string; q?: string }>;

function parseView(v?: string): RankingView {
  return v === "volume" ? "volume" : "momentum";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const view = parseView(sp.view);
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const base =
    view === "volume"
      ? "Top Websites by Organic Traffic Volume"
      : "The Organic Traffic Leaderboard";
  const title = page > 1 ? `${base} — Page ${page}` : base;

  // Volume view keeps its own canonical; the search view (?q=) stays out of the
  // index to avoid thin/duplicate query pages.
  const searching = Boolean(sp.q?.trim());
  const canonical = view === "volume" ? "/leaderboard?view=volume" : "/leaderboard";

  return {
    title,
    description: siteConfig.description,
    alternates: { canonical: searching ? "/leaderboard" : canonical },
    ...(searching ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const view = parseView(sp.view);
  const page = Number.parseInt(sp.page ?? "1", 10) || 1;
  const query = (sp.q ?? "").trim().toLowerCase();

  const data = await getLeaderboardData(view);

  return (
    <>
      <section className="border-b border-border/60">
        <div className="container py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Home
          </Link>
          <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Organic traffic leaderboard
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Every verified site, ranked by real Google Search Console clicks.
            Switch between momentum and volume, search for a site, or page through
            the full board.
          </p>
        </div>
      </section>

      <LeaderboardSection
        data={data}
        view={view}
        query={query}
        page={page}
        interactive
      />
    </>
  );
}
