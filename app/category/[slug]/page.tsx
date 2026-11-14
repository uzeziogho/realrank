import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { RankingToggle } from "@/components/ranking-toggle";
import { Leaderboard } from "@/components/leaderboard";
import { LeaderboardJsonLd } from "@/components/json-ld";
import { getLeaderboardData, attachSparklines } from "@/lib/data";
import { RankingExplainer } from "@/components/ranking-explainer";
import {
  siteConfig,
  categories,
  categoryLabel,
  type RankingView,
} from "@/lib/config";
import { formatCompact, timeAgo } from "@/lib/utils";
import { MIN_RANKED_FOR_CATEGORY, rankedOnly } from "@/lib/indexing";
import { GetOnBoard } from "@/components/get-on-board";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ view?: string }>;

function parseView(v?: string): RankingView {
  return v === "volume" ? "volume" : "momentum";
}

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const known = categories.find((c) => c.slug === slug);
  if (!known) return {};
  const label = known.label;
  // A board with only a site or two is thin — keep it crawlable (it links to
  // real profiles) but out of the index until it's a real ranking. The sitemap
  // applies the same bar.
  const data = await getLeaderboardData("momentum", { category: slug });
  const thin = rankedOnly(data.organic).length < MIN_RANKED_FOR_CATEGORY;
  return {
    title: `Top ${label} Sites by Organic Traffic`,
    description: `The fastest-growing ${label} websites ranked by verified organic Search Console clicks on ${siteConfig.name}.`,
    alternates: { canonical: `/category/${slug}` },
    ...(thin ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  if (!categories.some((c) => c.slug === slug)) notFound();

  const view = parseView((await searchParams).view);
  const data = await getLeaderboardData(view, { category: slug });
  const rows = await attachSparklines(data.rows);
  const label = categoryLabel(slug);

  return (
    <div className="container py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        All sites
      </Link>

      <div className="mt-4 mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Top {label} sites
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatCompact(data.totalSites)} sites · {formatCompact(data.totalClicks28d)}{" "}
            organic clicks in 28 days · updated{" "}
            {data.lastUpdated ? timeAgo(data.lastUpdated) : "—"}
          </p>
        </div>
        <Suspense fallback={null}>
          <RankingToggle view={view} counts={data.counts} />
        </Suspense>
      </div>

      {data.organic.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          No verified sites in this category yet.{" "}
          <Link href="/login" className="text-primary hover:underline">
            Be the first — get a verified rank.
          </Link>
        </div>
      ) : (
        <>
          <LeaderboardJsonLd sites={data.organic} />
          <div className="mb-6">
            <RankingExplainer />
          </div>
          <Leaderboard rows={rows} view={view} foundingCutoff={data.founding.cutoff} />
        </>
      )}

      <p className="mt-8 text-sm text-muted-foreground">
        This board is verified-only.{" "}
        <Link href={`/best/${slug}`} className="text-primary hover:underline">
          Browse every {label} project in the directory →
        </Link>
      </p>

      <GetOnBoard source="category" primary="rank" className="mt-10" />
    </div>
  );
}
