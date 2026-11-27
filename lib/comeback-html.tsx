import "server-only";

import { render } from "@react-email/components";
import { WeeklyReportEmail } from "@/emails/weekly-report";
import { TopAlertEmail } from "@/emails/top-alert";
import { nudgeParts, type HtmlRenderers, type OwnerSiteLine } from "@/lib/comeback";
import { benchmarkText, opportunityText } from "@/lib/insights";
import { siteConfig } from "@/lib/config";

/**
 * React Email renderers for the designed comeback emails. Imported only by
 * route handlers (the cron and the admin preview): React Email renders with
 * react-dom/server, which Next.js doesn't allow inside server components.
 */

const dateLabel = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export const comebackHtml: HtmlRenderers = {
  async weekly(lines: OwnerSiteLine[], unsub: string, now: Date) {
    const lead = lines.filter((l) => l.rank !== null).sort((a, b) => a.rank! - b.rank!)[0];
    const benchmarks = Object.fromEntries(
      lines.filter((l) => l.benchmark).map((l) => [l.siteId, benchmarkText(l.benchmark!)]),
    );
    const opp = lead?.opportunity ? opportunityText(lead.opportunity) : null;
    return render(
      <WeeklyReportEmail
        siteUrl={siteConfig.url}
        siteName={siteConfig.name}
        dateLabel={dateLabel(now)}
        sites={lines}
        nudge={lead ? nudgeParts(lead) : null}
        benchmarks={benchmarks}
        opportunity={opp ? { siteName: lead.name, ...opp, href: `${siteConfig.url}/dashboard/leaks` } : null}
        unsubscribeUrl={unsub}
      />,
    );
  },
  async top(line: OwnerSiteLine, from: number | null, unsub: string) {
    const profile = `${siteConfig.url}/site/${line.host}`;
    const shareText = `${line.name} is #1 on ${siteConfig.name}: the fastest-growing site, ranked by verified Google Search Console clicks.`;
    return render(
      <TopAlertEmail
        siteUrl={siteConfig.url}
        siteName={siteConfig.name}
        site={line}
        from={from}
        shareUrl={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profile)}`}
        nudge={nudgeParts(line)}
        unsubscribeUrl={unsub}
      />,
    );
  },
};

/** Example data for previewing the designs before any real email is due. */
export const SAMPLE_LINE: OwnerSiteLine = {
  siteId: "sample",
  name: "Example Site",
  host: "example.com",
  rank: 4,
  total: 31,
  prevRank: 7,
  clicks7d: 1240,
  growth: 0.38,
  nextUp: { name: "Another Site", rank: 3 },
  listed: false,
  spotlightUntil: null,
  spark: [92, 101, 96, 110, 104, 118, 121, 130, 126, 141, 150, 147, 168, 175],
  benchmark: { percentile: 72, peers: 18, category: "SaaS" },
  opportunity: {
    kind: "page2",
    query: "example search phrase",
    position: 12.4,
    impressions: 1840,
    ctr: 0.004,
    expectedCtr: 0.012,
    clicks: 37,
  },
};
