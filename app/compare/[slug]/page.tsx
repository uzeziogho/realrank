import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/sparkline";
import { SiteFavicon } from "@/components/site-favicon";
import { getSiteProfileBySlug, type SiteProfile } from "@/lib/site";
import { siteConfig } from "@/lib/config";
import { formatCompact, formatGrowth, hostname } from "@/lib/utils";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

/** Split "a-vs-b" into its two hostnames (first "-vs-" wins). */
function parsePair(slug: string): [string, string] | null {
  const i = slug.indexOf("-vs-");
  if (i <= 0) return null;
  const a = slug.slice(0, i).toLowerCase();
  const b = slug.slice(i + 4).toLowerCase();
  if (!a || !b || a === b) return null;
  return [a, b];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const pair = parsePair(slug);
  if (!pair) return { title: "Compare sites" };
  const [a, b] = pair;
  const title = `${a} vs ${b} — organic traffic & momentum compared`;
  return {
    title,
    description: `Side-by-side: ${a} vs ${b} by verified organic search traffic, momentum, and domain authority on ${siteConfig.name}.`,
    alternates: { canonical: `/compare/${a}-vs-${b}` },
    openGraph: { title, url: `${siteConfig.url}/compare/${a}-vs-${b}` },
  };
}

export default async function ComparePage({ params }: { params: Params }) {
  const { slug } = await params;
  const pair = parsePair(slug);
  if (!pair) notFound();

  const [aProfile, bProfile] = await Promise.all([
    getSiteProfileBySlug(pair[0]),
    getSiteProfileBySlug(pair[1]),
  ]);
  if (!aProfile || !bProfile) notFound();

  const a = aProfile.site;
  const b = bProfile.site;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${a.displayName} vs ${b.displayName}`,
    itemListElement: [a, b].map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteConfig.url}/site/${hostname(s.siteUrl).toLowerCase()}`,
      name: s.displayName,
    })),
  };

  // rows: [label, aValue, bValue, winner] where winner: 'a' | 'b' | 'tie'
  const rows: { label: string; a: string; b: string; win: "a" | "b" | "tie" }[] = [
    row("Momentum rank", `#${a.rank}`, `#${b.rank}`, a.rank, b.rank, "lower"),
    row("Momentum score", a.momentumScore.toFixed(0), b.momentumScore.toFixed(0), a.momentumScore, b.momentumScore, "higher"),
    row("7-day clicks", formatCompact(a.clicks7d), formatCompact(b.clicks7d), a.clicks7d, b.clicks7d, "higher"),
    row("28-day clicks", formatCompact(a.clicks28d), formatCompact(b.clicks28d), a.clicks28d, b.clicks28d, "higher"),
    row("Growth (7d vs prior)", formatGrowth(a.growthRate), formatGrowth(b.growthRate), a.growthRate, b.growthRate, "higher"),
    row("Volume rank", `#${aProfile.volumeRank}`, `#${bProfile.volumeRank}`, aProfile.volumeRank, bProfile.volumeRank, "lower"),
  ];
  if (a.domainRank != null || b.domainRank != null) {
    rows.push(
      row(
        "Domain authority (DR)",
        a.domainRank != null ? `${a.domainRank.toFixed(1)}/10` : "—",
        b.domainRank != null ? `${b.domainRank.toFixed(1)}/10` : "—",
        a.domainRank ?? -1,
        b.domainRank ?? -1,
        "higher",
      ),
    );
  }

  return (
    <div className="container max-w-3xl py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Leaderboard
      </Link>

      <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
        {a.displayName} vs {b.displayName}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Verified organic traffic and momentum, side by side — from Google Search Console.
      </p>

      {/* Headers with favicons + sparklines */}
      <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-start gap-4">
        <SiteColumn profile={aProfile} />
        <div className="pt-6 text-center text-sm font-semibold text-muted-foreground">vs</div>
        <SiteColumn profile={bProfile} />
      </div>

      {/* Metric comparison */}
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className={`px-4 py-3 text-right tabular-nums ${r.win === "a" ? "font-semibold text-success" : ""}`}>{r.a}</td>
                <th className="w-px whitespace-nowrap px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">{r.label}</th>
                <td className={`px-4 py-3 tabular-nums ${r.win === "b" ? "font-semibold text-success" : ""}`}>{r.b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Green = leading on that metric. Rankings update hourly from verified Search Console data.
      </p>

      <div className="mt-10 rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-medium">Want your site in comparisons like this?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Google Search Console and your verified momentum joins the board.
        </p>
        <Button asChild className="mt-4">
          <Link href="/login">Connect Search Console</Link>
        </Button>
      </div>
    </div>
  );
}

function SiteColumn({ profile }: { profile: SiteProfile }) {
  const s = profile.site;
  const host = hostname(s.siteUrl).toLowerCase();
  return (
    <div className="flex flex-col items-center text-center">
      <SiteFavicon url={s.siteUrl} name={s.displayName} size={40} />
      <Link href={`/site/${host}`} className="mt-2 font-semibold hover:underline">
        {s.displayName}
      </Link>
      <p className="text-xs text-muted-foreground">#{s.rank} · momentum</p>
      <div className="mt-2 w-full max-w-[160px]">
        <Sparkline data={profile.history.map((h) => h.clicks)} width={160} height={36} />
      </div>
    </div>
  );
}

function row(
  label: string,
  aStr: string,
  bStr: string,
  aVal: number,
  bVal: number,
  better: "higher" | "lower",
): { label: string; a: string; b: string; win: "a" | "b" | "tie" } {
  let win: "a" | "b" | "tie" = "tie";
  if (aVal !== bVal) {
    const aWins = better === "higher" ? aVal > bVal : aVal < bVal;
    win = aWins ? "a" : "b";
  }
  return { label, a: aStr, b: bStr, win };
}
