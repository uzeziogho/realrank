import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ArrowUpRight, ShieldCheck, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFavicon } from "@/components/site-favicon";
import { getSiteProfileBySlug, getAllSiteSlugs, siteSlug } from "@/lib/site";
import { getLeaderboardData } from "@/lib/data";
import { siteConfig, categoryLabel } from "@/lib/config";
import { cn, formatCompact, formatGrowth, hostname, siteHref } from "@/lib/utils";
import type { RankedSite } from "@/lib/types";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getAllSiteSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getSiteProfileBySlug(slug);
  if (!profile) return { title: "Alternatives" };
  const name = profile.site.displayName;
  const label = profile.site.category ? categoryLabel(profile.site.category) : "";
  const title = `Top ${name} Alternatives — Ranked by Verified Traffic`;
  return {
    title,
    description: `The best ${label ? label + " " : ""}alternatives to ${name}, ranked by verified Google Search Console momentum on ${siteConfig.name} — real organic traffic, not estimates.`,
    alternates: { canonical: `/alternatives/${siteSlug(profile.site.siteUrl)}` },
    openGraph: { title, url: `${siteConfig.url}/alternatives/${siteSlug(profile.site.siteUrl)}` },
  };
}

export default async function AlternativesPage({ params }: { params: Params }) {
  const { slug } = await params;
  const profile = await getSiteProfileBySlug(slug);
  if (!profile) notFound();

  const target = profile.site;
  const targetHost = hostname(target.siteUrl).toLowerCase();
  const label = target.category ? categoryLabel(target.category) : null;

  // Peers = same-category ranked sites, minus the target itself.
  const data = target.category
    ? await getLeaderboardData("momentum", { category: target.category })
    : await getLeaderboardData("momentum");
  const alternatives = data.organic
    .filter((s) => !s.pending && hostname(s.siteUrl).toLowerCase() !== targetHost)
    .slice(0, 12);

  return (
    <div className="container max-w-3xl py-12">
      <Link
        href={`/site/${targetHost}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {target.displayName}
      </Link>

      <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight">
        Top {target.displayName} alternatives
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        {label ? `${label} tools` : "Sites"} ranked by <strong className="text-foreground">verified</strong> organic
        momentum — real Google Search Console clicks, not third-party estimates. Updated hourly.
      </p>

      {alternatives.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
          No verified alternatives ranked yet in this category.{" "}
          <Link href="/login" className="text-primary hover:underline">Be the first to claim a spot.</Link>
        </div>
      ) : (
        <ol className="mt-8 space-y-3">
          {alternatives.map((s, i) => (
            <AlternativeRow key={s.id} rank={i + 1} site={s} targetHost={targetHost} />
          ))}
        </ol>
      )}

      {/* Conversion band */}
      <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
        <ShieldCheck className="size-6 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">
          Building a {label ? label.toLowerCase() + " tool" : "product"}? Prove it&apos;s growing.
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Connect Google Search Console and let verified momentum — not marketing budgets —
          decide where you rank against {target.displayName} and the rest.
        </p>
        <Button asChild size="lg" className="mt-1">
          <Link href="/login">Claim my verified spot</Link>
        </Button>
      </div>
    </div>
  );
}

function AlternativeRow({
  rank,
  site,
  targetHost,
}: {
  rank: number;
  site: RankedSite;
  targetHost: string;
}) {
  const host = hostname(site.siteUrl).toLowerCase();
  const positive = site.growthRate > 0.005;
  const negative = site.growthRate < -0.005;
  const pair = [targetHost, host].sort().join("-vs-");
  return (
    <li className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
      <span className="w-6 shrink-0 text-center text-lg font-semibold tabular-nums text-muted-foreground">
        {rank}
      </span>
      <SiteFavicon url={site.siteUrl} name={site.displayName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/site/${host}`} className="truncate font-semibold hover:underline">
            {site.displayName}
          </Link>
          <a
            href={siteHref(site.siteUrl)}
            target="_blank"
            rel="noopener nofollow"
            aria-label={`Visit ${site.displayName}`}
            className="shrink-0 text-muted-foreground"
          >
            <ArrowUpRight className="size-3.5" />
          </a>
        </div>
        <p className="truncate text-xs text-muted-foreground">{hostname(site.siteUrl)}</p>
      </div>
      <div className="hidden text-right sm:block">
        <div className="text-sm font-semibold tabular-nums">{formatCompact(site.clicks28d)}</div>
        <div className="text-xs text-muted-foreground">28d clicks</div>
      </div>
      <span
        className={cn(
          "w-16 shrink-0 text-right text-sm font-medium tabular-nums",
          positive && "text-success",
          negative && "text-danger",
          !positive && !negative && "text-muted-foreground",
        )}
      >
        {formatGrowth(site.growthRate)}
      </span>
      <Link
        href={`/compare/${pair}`}
        className="hidden shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
      >
        <GitCompare className="size-3" /> vs
      </Link>
    </li>
  );
}
