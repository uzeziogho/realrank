import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFavicon } from "@/components/site-favicon";
import { getSiteProfileBySlug } from "@/lib/site";
import { siteConfig } from "@/lib/config";
import { cn, formatCompact, formatGrowth, hostname } from "@/lib/utils";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

function normalize(input: string): string {
  return decodeURIComponent(input).trim().toLowerCase().replace(/^www\./, "").split("/")[0];
}

/** A–F momentum grade from week-over-week growth of the daily click rate. */
function letterGrade(growth: number): { grade: string; blurb: string; tone: "up" | "flat" | "down" } {
  if (growth >= 1) return { grade: "A+", blurb: "Explosive — traffic is compounding fast.", tone: "up" };
  if (growth >= 0.5) return { grade: "A", blurb: "Excellent — clearly accelerating.", tone: "up" };
  if (growth >= 0.2) return { grade: "B", blurb: "Solid growth — momentum is building.", tone: "up" };
  if (growth >= 0.05) return { grade: "C", blurb: "Growing slowly — room to push harder.", tone: "up" };
  if (growth > -0.05) return { grade: "D", blurb: "Flat — holding, not building.", tone: "flat" };
  return { grade: "F", blurb: "Declining — momentum is slipping.", tone: "down" };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const domain = normalize(slug);
  const profile = await getSiteProfileBySlug(domain);
  const title = profile
    ? `${profile.site.displayName} — Traffic Report Card (Grade ${letterGrade(profile.site.growthRate).grade})`
    : `${domain} — Traffic Report Card`;
  return {
    title,
    description: `Verified organic-traffic report card for ${domain} on ${siteConfig.name}: momentum grade, rank, and real Google Search Console clicks.`,
    alternates: { canonical: `/report-card/${domain}` },
    openGraph: { title, url: `${siteConfig.url}/report-card/${domain}` },
  };
}

export default async function ReportCardPage({ params }: { params: Params }) {
  const { slug } = await params;
  const domain = normalize(slug);
  const profile = await getSiteProfileBySlug(domain);

  return (
    <div className="container max-w-2xl py-12">
      <Link
        href="/report-card"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Report card
      </Link>

      {profile ? <Verified profile={profile} /> : <Unverified domain={domain} />}
    </div>
  );
}

function Verified({ profile }: { profile: NonNullable<Awaited<ReturnType<typeof getSiteProfileBySlug>>> }) {
  const s = profile.site;
  const host = hostname(s.siteUrl);
  const g = letterGrade(s.growthRate);
  const shareText = `${s.displayName} scored a ${g.grade} on its verified organic traffic report card 📊`;
  const shareUrl = `${siteConfig.url}/report-card/${host.toLowerCase()}`;
  const xIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  const toneClass =
    g.tone === "up" ? "text-success" : g.tone === "down" ? "text-danger" : "text-muted-foreground";

  return (
    <>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border p-5">
          <SiteFavicon url={s.siteUrl} name={s.displayName} />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{s.displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{host}</p>
          </div>
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="size-3.5" /> Verified
          </span>
        </div>

        <div className="flex flex-col items-center gap-2 p-8 text-center">
          <div className={cn("text-7xl font-bold tabular-nums", toneClass)}>{g.grade}</div>
          <p className="text-sm text-muted-foreground">{g.blurb}</p>
          <p className={cn("mt-1 text-sm font-medium tabular-nums", toneClass)}>
            {formatGrowth(s.growthRate)} week-over-week
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
          <Stat label="Momentum rank" value={`#${s.rank}`} />
          <Stat label="Volume rank" value={`#${profile.volumeRank}`} />
          <Stat label="7d clicks" value={formatCompact(s.clicks7d)} />
          <Stat label="28d clicks" value={formatCompact(s.clicks28d)} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href={`/site/${host.toLowerCase()}`}>View full profile</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/alternatives/${host.toLowerCase()}`}>See alternatives</Link>
        </Button>
        <a
          href={xIntent}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Share on X
        </a>
      </div>
    </>
  );
}

function Unverified({ domain }: { domain: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
      <div className="text-6xl font-bold text-muted-foreground/50">?</div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{domain}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        This domain isn&apos;t verified on {siteConfig.name} yet, so there&apos;s no report card to
        show. Connect Google Search Console (read-only) and we&apos;ll grade your{" "}
        <strong className="text-foreground">real</strong> organic momentum and put you on the board.
      </p>
      <Button asChild size="lg" className="mt-5">
        <Link href="/login">
          Verify {domain} <ArrowRight className="size-4" />
        </Link>
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">
        Want to grade your growth without connecting?{" "}
        <Link href="/organic-growth-grade" className="text-primary hover:underline">
          Try the manual grader
        </Link>
        .
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-4 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
