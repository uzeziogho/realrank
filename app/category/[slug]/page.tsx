import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { RankingToggle } from "@/components/ranking-toggle";
import { Leaderboard } from "@/components/leaderboard";
import { LeaderboardJsonLd } from "@/components/json-ld";
import { getLeaderboardData, attachSparklines } from "@/lib/data";
import {
  siteConfig,
  categories,
  categoryLabel,
  type RankingView,
} from "@/lib/config";
import { formatCompact, timeAgo } from "@/lib/utils";

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
  return {
    title: `Top ${label} Sites by Organic Traffic`,
    description: `The fastest-growing ${label} websites ranked by verified organic Search Console clicks on ${siteConfig.name}.`,
    alternates: { canonical: `/category/${slug}` },
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
          No sites in this category yet.{" "}
          <Link href="/dashboard" className="text-primary hover:underline">
            Be the first to publish.
          </Link>
        </div>
      ) : (
        <>
          <LeaderboardJsonLd sites={data.organic} />
          <Leaderboard rows={rows} view={view} foundingCutoff={data.founding.cutoff} />
        </>
      )}
    </div>
  );
}
