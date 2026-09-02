import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink, TrendingUp, BarChart3, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BadgeEmbed } from "@/components/badge-embed";
import { ShareRank } from "@/components/share-rank";
import { MomentumTimeline } from "@/components/momentum-timeline";
import { SiteFavicon } from "@/components/site-favicon";
import { getSiteProfileBySlug, siteSlug } from "@/lib/site";
import { siteConfig, categoryLabel } from "@/lib/config";
import { formatCompact, formatGrowth, hostname, siteHref, timeAgo } from "@/lib/utils";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getSiteProfileBySlug(slug);
  if (!profile) return { title: "Site not found" };

  const { site } = profile;
  const title = `${site.displayName} — #${site.rank} on ${siteConfig.name}`;
  const description = `${site.displayName} ranks #${site.rank} of ${profile.totalSites} by organic momentum (${formatGrowth(site.growthRate)}) on ${siteConfig.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `/site/${siteSlug(site.siteUrl)}` },
    openGraph: { title, description, url: `${siteConfig.url}/site/${siteSlug(site.siteUrl)}` },
  };
}

export default async function SiteProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  const profile = await getSiteProfileBySlug(slug);
  if (!profile) notFound();

  const { site, volumeRank, totalSites, lastUpdated, history, usingDummyData, rival, founding } = profile;
  const slugValue = siteSlug(site.siteUrl);
  const profileUrl = `${siteConfig.url}/site/${slugValue}`;
  const badgeUrl = `${siteConfig.url}/api/badge/${slugValue}.svg`;

  // Verified-flavored share copy — the ranking as proof, not hype. Include the
  // week's climb when this site is a mover.
  const climbLine =
    site.rankDelta && site.rankDelta > 0 ? ` (up ${site.rankDelta} spots this week)` : "";
  const shareText = `📈 ${site.displayName} is #${site.rank} of ${profile.totalSites} on ${siteConfig.name} by verified organic momentum${climbLine} — ${formatGrowth(site.growthRate)} growth, straight from Google Search Console (not estimates).`;
  const shareCaption = `${shareText}\n\n${profileUrl}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`;
  const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;
  const cardImageUrl = `/site/${slugValue}/opengraph-image`;

  return (
    <div className="container max-w-3xl py-12">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Leaderboard
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <SiteFavicon url={site.siteUrl} name={site.displayName} size={28} />
            <h1 className="text-3xl font-bold tracking-tight">{site.displayName}</h1>
            {founding && (
              <span
                title="Founding member — one of the first sites on RealRank"
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                <Sparkles className="size-3.5" /> Founder
              </span>
            )}
            {site.category && <Badge variant="outline">{categoryLabel(site.category)}</Badge>}
          </div>
          <p className="mt-1 text-muted-foreground">{hostname(site.siteUrl)}</p>
          {site.description && <p className="mt-2 text-sm text-muted-foreground">{site.description}</p>}
        </div>
        <Button asChild variant="outline">
          <a href={siteHref(site.siteUrl)} target="_blank" rel="noopener nofollow">
            Visit site <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>

      {/* Rank cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <RankCard
          icon={<TrendingUp className="size-4" />}
          label="Momentum rank"
          rank={site.rank}
          total={totalSites}
          sub={`${formatGrowth(site.growthRate)} growth`}
          subTone={site.growthRate >= 0 ? "up" : "down"}
        />
        <RankCard
          icon={<BarChart3 className="size-4" />}
          label="Volume rank"
          rank={volumeRank}
          total={totalSites}
          sub={`${formatCompact(site.clicks28d)} clicks / 28d`}
        />
      </div>

      {/* Head-to-head compare CTA */}
      {rival && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-3 text-sm">
          <span className="text-muted-foreground">
            How does {site.displayName} stack up against{" "}
            <span className="text-foreground">{rival.displayName}</span> (#{rival.rank})?
          </span>
          <Link
            href={`/compare/${slugValue}-vs-${rival.slug}`}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            Compare <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      )}

      {/* Metrics */}
      <div
        className={`mt-4 grid grid-cols-2 gap-4 rounded-xl border border-border bg-card p-6 ${
          site.domainRank != null ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        <Metric label="7-day clicks" value={formatCompact(site.clicks7d)} />
        <Metric label="28-day clicks" value={formatCompact(site.clicks28d)} />
        <Metric label="Momentum score" value={site.momentumScore.toFixed(0)} />
        {site.domainRank != null && (
          <Metric label="Domain authority (DR)" value={`${site.domainRank.toFixed(1)}/10`} />
        )}
      </div>
      {site.domainRank != null && (
        <p className="mt-2 text-xs text-muted-foreground">
          DR is a third-party domain-authority estimate (Open PageRank, 0–10) — shown for
          context; it does not affect momentum or volume ranking.
        </p>
      )}

      {/* Momentum timeline */}
      <section className="mt-8">
        <MomentumTimeline history={history} preview={usingDummyData} />
      </section>

      {/* Share your rank — turn the ranking into a post */}
      <section id="share" className="mt-8 scroll-mt-20">
        <h2 className="text-lg font-semibold">Share your rank</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Your verified card, ready to post — attach the image, or paste the caption.
        </p>
        <ShareRank
          cardImageUrl={cardImageUrl}
          fileName={`${slugValue}-realrank.png`}
          caption={shareCaption}
          xUrl={xUrl}
          linkedInUrl={liUrl}
        />
      </section>

      {/* Badge embed */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold">Embed your badge</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Show your rank on your own site. The badge links back here and updates automatically.
        </p>
        <BadgeEmbed profileUrl={profileUrl} badgeUrl={badgeUrl} />
      </section>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Updated {lastUpdated ? timeAgo(lastUpdated) : "—"}.
      </p>
    </div>
  );
}

function RankCard({
  icon,
  label,
  rank,
  total,
  sub,
  subTone,
}: {
  icon: React.ReactNode;
  label: string;
  rank: number;
  total: number;
  sub: string;
  subTone?: "up" | "down";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-4xl font-bold tabular-nums">
        #{rank} <span className="text-base font-normal text-muted-foreground">of {total}</span>
      </p>
      <p
        className={`mt-1 text-sm ${
          subTone === "up" ? "text-success" : subTone === "down" ? "text-danger" : "text-muted-foreground"
        }`}
      >
        {sub}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
