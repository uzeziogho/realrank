import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ShieldCheck, TrendingUp, Layers, Target, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CiteReport } from "@/components/cite-report";
import { getIndieReport } from "@/lib/report";
import { siteConfig } from "@/lib/config";
import { formatCompact, timeAgo } from "@/lib/utils";

export const revalidate = 3600;

const PATH = "/state-of-indie-organic-traffic";
const URL = `${siteConfig.url}${PATH}`;

export async function generateMetadata(): Promise<Metadata> {
  const r = await getIndieReport();
  const title = `The State of Indie Organic Traffic (${r.period})`;
  const description =
    r.sampleSites > 0
      ? `${r.verifiedSites} indie sites, measured from real Google Search Console clicks: the typical site gets ${formatCompact(r.medianClicks28d)} organic clicks / 28 days, the top 10% hold ${r.topDecileSharePct}% of all traffic, and the median site is ${r.medianGrowth >= 0 ? "growing" : "shrinking"} ${r.medianGrowthLabel} week-over-week. Verified data, not estimates — free to cite.`
      : `A live benchmark of indie organic traffic, measured from real Google Search Console clicks — not third-party estimates. Free to cite.`;
  return {
    title,
    description,
    alternates: { canonical: PATH },
    keywords: [
      "indie organic traffic",
      "state of indie SEO",
      "indie SaaS traffic benchmark",
      "organic traffic report",
      "verified search console data",
      "indie hacker SEO stats",
    ],
    openGraph: { title, description, url: URL },
  };
}

export default async function StateOfIndieOrganicTrafficPage() {
  const r = await getIndieReport();
  const warming = r.sampleSites === 0;

  const num = (n: number) => (warming ? "—" : formatCompact(n));

  const lead = warming
    ? `This report reads the state of indie organic traffic from real Google Search Console data. It's warming up as verified sites connect — once enough clear the sample threshold, every figure below fills in and refreshes automatically.`
    : `Across ${r.verifiedSites} verified indie websites, the typical site earns ${formatCompact(r.medianClicks28d)} organic clicks every 28 days — and the top 10% capture ${r.topDecileSharePct}% of all organic traffic. The median site is ${r.medianGrowth > 0.005 ? "growing" : r.medianGrowth < -0.005 ? "shrinking" : "holding flat"} ${r.medianGrowthLabel} week-over-week. Every number here comes from real Google Search Console clicks the sites opted to share — not SimilarWeb-style estimates.`;

  const citation = warming
    ? `RealRank — The State of Indie Organic Traffic (${r.period}). Source: ${URL}`
    : `As of ${r.period}, the typical indie website earns ${formatCompact(r.medianClicks28d)} organic clicks per 28 days, with the top 10% of sites holding ${r.topDecileSharePct}% of all organic traffic (n=${r.verifiedSites} verified sites, measured from Google Search Console). Source: RealRank — The State of Indie Organic Traffic, ${URL}`;
  const embed = `<a href="${URL}" target="_blank" rel="noopener">The State of Indie Organic Traffic — RealRank (${r.period})</a>`;

  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `The State of Indie Organic Traffic (${r.period})`,
    description:
      "A benchmark of organic search traffic across independent websites, measured from verified Google Search Console clicks — median traffic, concentration, growth, and per-category breakdowns.",
    url: URL,
    creator: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
    isAccessibleForFree: true,
    license: "https://creativecommons.org/licenses/by/4.0/",
    ...(r.lastUpdated ? { dateModified: r.lastUpdated } : {}),
    variableMeasured: [
      "Median 28-day organic clicks per site",
      "Top-decile traffic concentration",
      "Median week-over-week organic growth",
      "Organic clicks by category",
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dataset) }} />

      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container max-w-4xl py-12">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Stats", href: "/stats" },
              { name: "State of Indie Organic Traffic" },
            ]}
          />
          <div className="mt-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="size-3.5 text-primary" /> Report · {r.period}
            {r.lastUpdated && <span className="text-border">·</span>}
            {r.lastUpdated && <span>updated {timeAgo(r.lastUpdated)}</span>}
          </div>
          <h1 className="mt-3 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            The State of Indie Organic Traffic
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">{lead}</p>
        </div>
      </section>

      <div className="container max-w-4xl py-10">
        {/* Key findings */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat icon={<ShieldCheck className="size-4" />} label="Verified sites" value={num(r.verifiedSites)} />
          <Stat icon={<BarChart3 className="size-4" />} label="Organic clicks / 28d" value={num(r.totalClicks28d)} />
          <Stat icon={<Target className="size-4" />} label="Median clicks / site" value={num(r.medianClicks28d)} />
          <Stat
            icon={<Layers className="size-4" />}
            label="Top 10% hold"
            value={warming ? "—" : `${r.topDecileSharePct}%`}
            hint="of all organic traffic"
          />
          <Stat
            icon={<TrendingUp className="size-4" />}
            label="Median growth (WoW)"
            value={warming ? "—" : r.medianGrowthLabel}
            hint={`Index ${warming ? "—" : r.index}`}
          />
          <Stat
            icon={<TrendingUp className="size-4" />}
            label="Fastest category"
            value={r.fastestCategory ? r.fastestCategory.label : "—"}
            hint={r.fastestCategory ? `${r.fastestCategory.medianGrowthLabel} median` : "needs more data"}
          />
        </div>

        {/* How much traffic */}
        <Section title="How much organic traffic does a typical indie site get?">
          {warming ? (
            <p>
              Not enough verified sites have connected yet to publish a median. As the sample grows, this
              section will report the typical indie site&apos;s organic clicks and how concentrated traffic
              is at the top.
            </p>
          ) : (
            <>
              <p>
                The median verified indie site earns <strong>{formatCompact(r.medianClicks28d)}</strong>{" "}
                organic clicks over 28 days — a reminder that most indie traffic is modest and hard-won.
                Traffic is heavily concentrated: the <strong>top 10%</strong> of sites hold{" "}
                <strong>{r.topDecileSharePct}%</strong> of all organic clicks across the{" "}
                {r.sampleSites} sites with measurable traffic. A long tail of small sites sits beneath a
                short head of break-outs — which is exactly why ranking by <em>momentum</em> rather than
                size surfaces the climbers you&apos;d otherwise never see.
              </p>
            </>
          )}
        </Section>

        {/* Category table */}
        <Section title="Which categories are growing fastest?">
          {r.categories.length === 0 ? (
            <p>Category breakdowns appear once verified sites span enough categories.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Category</th>
                    <th className="px-4 py-2.5 text-right font-medium">Sites</th>
                    <th className="px-4 py-2.5 text-right font-medium">Clicks / 28d</th>
                    <th className="px-4 py-2.5 text-right font-medium">Median growth</th>
                  </tr>
                </thead>
                <tbody>
                  {r.categories.map((c) => (
                    <tr key={c.slug} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2.5 font-medium">
                        <Link href={`/best/fastest-growing/${c.slug}`} className="hover:text-primary hover:underline">
                          {c.label}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{c.sites}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatCompact(c.clicks28d)}</td>
                      <td
                        className={
                          "px-4 py-2.5 text-right tabular-nums font-medium " +
                          (c.sites < 3
                            ? "text-muted-foreground/50"
                            : c.medianGrowth > 0.005
                              ? "text-success"
                              : c.medianGrowth < -0.005
                                ? "text-danger"
                                : "text-muted-foreground")
                        }
                      >
                        {c.sites < 3 ? "—" : c.medianGrowthLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Growth is the median week-over-week change in organic clicks; categories with fewer than 3
            measurable sites show no figure to avoid noise.
          </p>
        </Section>

        {/* Index */}
        <Section title="Is indie organic search growing or shrinking?">
          {warming ? (
            <p>The growing-vs-declining split publishes once enough sites clear the sample threshold.</p>
          ) : (
            <p>
              The <Link href="/stats">RealRank Index</Link> sits at <strong>{r.index}</strong> (100 = flat):{" "}
              <strong className="text-success">{r.growingPct}%</strong> of verified sites gained organic
              clicks and <strong className="text-danger">{r.decliningPct}%</strong> lost them. It&apos;s a
              live read on whether indie organic search is expanding or contracting — updated as the
              underlying Search Console data refreshes, never a one-off snapshot.
            </p>
          )}
        </Section>

        {/* Methodology */}
        <Section title="Measured, not estimated">
          <p>
            Every figure here is computed from real Google Search Console clicks that each site connected
            and opted to publish — read-only, click counts only, never queries or revenue. There are no
            SimilarWeb-style models, no scraping, and no self-reported numbers. Sites with no traffic in
            the window are excluded from medians so a wave of brand-new listings can&apos;t skew the
            benchmark. The dataset refreshes continuously, so this report reflects {r.period} and keeps
            current on its own.
          </p>
        </Section>

        {/* DR4 / verified-traffic hook */}
        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold tracking-tight">Why verified traffic is the number that matters now</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Even Ahrefs&apos; new DR4 model now weights links by the <em>real organic traffic</em> of the
            linking site — the same signal this report is built on. Third-party authority scores are
            converging on what RealRank has measured all along: not estimates or vote counts, but verified
            organic clicks. That&apos;s the honest benchmark for an indie site&apos;s reach.
          </p>
        </div>

        {/* Cite */}
        <div className="mt-8">
          <CiteReport citation={citation} embed={embed} />
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-8">
          <Button asChild size="lg">
            <Link href="/login">
              <ShieldCheck className="size-4" /> Get a verified rank — free
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/submit">
              <Plus className="size-4" /> List your project
            </Link>
          </Button>
          <Link href="/leaderboard" className="text-sm font-medium text-primary hover:underline">
            See the live leaderboard →
          </Link>
        </div>
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      <span className="text-2xl font-bold tracking-tight tabular-nums">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:text-primary [&_a:hover]:underline [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
