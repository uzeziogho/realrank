import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout, TrendBars, CtaButton, brand } from "./layout";
import type { OwnerSiteLine } from "@/lib/comeback";

/**
 * The Monday rank report for verified site owners: a rank card per ranked
 * site (rank, change since last week, clicks, momentum, 14-day trend, who's
 * next), a short note for sites still waiting for clicks, and one next step.
 */

export interface WeeklyReportProps {
  siteUrl: string;
  siteName: string;
  dateLabel: string;
  sites: OwnerSiteLine[];
  nudge: { text: string; href: string; label: string } | null;
  /** Benchmark sentence per site id, e.g. "Growing faster than 72% of verified SaaS sites". */
  benchmarks?: Record<string, string>;
  /** The week's biggest Search Console opportunity for the lead site. */
  opportunity?: { siteName: string; headline: string; detail: string; href: string } | null;
  unsubscribeUrl: string;
}

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K` : String(n);
const pct = (g: number) => `${g > 0 ? "+" : g < 0 ? "−" : ""}${Math.abs(Math.round(g * 100))}%`;

function ChangePill({ rank, prev }: { rank: number; prev: number | null }) {
  const [label, color, bg] =
    prev === null
      ? ["First weekly report", brand.muted, "#f1f1f3"]
      : prev > rank
        ? [`▲ ${prev - rank} since last week`, brand.green, brand.greenSoft]
        : prev < rank
          ? [`▼ ${rank - prev} since last week`, brand.red, "#fdecec"]
          : ["Same as last week", brand.muted, "#f1f1f3"];
  return (
    <span style={{ display: "inline-block", fontSize: 12, fontWeight: 600, color, backgroundColor: bg, borderRadius: 999, padding: "3px 10px" }}>
      {label}
    </span>
  );
}

function RankCard({ s, siteUrl, benchmark }: { s: OwnerSiteLine; siteUrl: string; benchmark?: string }) {
  const profile = `${siteUrl}/site/${s.host}`;
  return (
    <Section style={{ border: `1px solid ${brand.line}`, borderRadius: 12, padding: "18px 20px", marginTop: 16 }}>
      <Text style={{ margin: 0, fontSize: 14, fontWeight: 600, color: brand.ink }}>
        {s.name} <span style={{ fontWeight: 400, color: brand.muted }}>· {s.host}</span>
      </Text>
      <table cellPadding={0} cellSpacing={0} role="presentation" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={{ fontSize: 44, lineHeight: "48px", fontWeight: 800, color: brand.ink, paddingRight: 12, letterSpacing: "-1px" }}>
              #{s.rank}
            </td>
            <td style={{ fontSize: 13, lineHeight: "18px", color: brand.muted }}>
              of {s.total} on the
              <br />
              momentum board
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: 10 }}>
        <ChangePill rank={s.rank!} prev={s.prevRank} />
      </div>
      {benchmark && (
        <Text style={{ margin: "10px 0 0", fontSize: 13, lineHeight: "18px", color: brand.ink }}>
          <span style={{ color: brand.green, fontWeight: 700 }}>●</span> {benchmark}
        </Text>
      )}
      <table cellPadding={0} cellSpacing={0} role="presentation" width="100%" style={{ marginTop: 16 }}>
        <tbody>
          <tr>
            <td width="50%" style={{ verticalAlign: "top" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: brand.ink }}>{compact(s.clicks7d)}</div>
              <div style={{ fontSize: 12, color: brand.muted }}>organic clicks, last 7 days</div>
            </td>
            <td width="50%" style={{ verticalAlign: "top" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.growth < 0 ? brand.red : brand.green }}>{pct(s.growth)}</div>
              <div style={{ fontSize: 12, color: brand.muted }}>momentum vs the prior 3 weeks</div>
            </td>
          </tr>
        </tbody>
      </table>
      {s.spark && <TrendBars values={s.spark.slice(-14)} label="Daily organic clicks, last 14 days" />}
      <Text style={{ margin: "14px 0 0", fontSize: 13, color: brand.muted }}>
        {s.nextUp ? (
          <>
            Next up: <span style={{ color: brand.ink, fontWeight: 600 }}>{s.nextUp.name}</span> at #{s.nextUp.rank}
          </>
        ) : (
          <>You&apos;re #1 — {s.total - 1} verified sites behind you.</>
        )}
        {" · "}
        <Link href={profile} style={{ color: brand.green, textDecoration: "none", fontWeight: 600 }}>
          Your profile →
        </Link>
      </Text>
    </Section>
  );
}

export function WeeklyReportEmail({
  siteUrl,
  siteName,
  dateLabel,
  sites,
  nudge,
  benchmarks = {},
  opportunity = null,
  unsubscribeUrl,
}: WeeklyReportProps) {
  const ranked = sites.filter((s) => s.rank !== null).sort((a, b) => a.rank! - b.rank!);
  const waiting = sites.filter((s) => s.rank === null);
  const lead = ranked[0];
  const preview = lead
    ? `${lead.name} is #${lead.rank} of ${lead.total}${
        lead.prevRank !== null && lead.prevRank !== lead.rank
          ? ` — ${lead.prevRank > lead.rank! ? "up" : "down"} ${Math.abs(lead.prevRank - lead.rank!)} since last week`
          : ""
      }`
    : `Your ${siteName} week`;

  return (
    <EmailLayout
      preview={preview}
      siteUrl={siteUrl}
      siteName={siteName}
      eyebrow={`Weekly report · ${dateLabel}`}
      reason={`You're getting this because you connected Search Console to ${siteName}: one email a week, plus a note when your rank jumps.`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Heading as="h1" style={{ margin: 0, fontSize: 22, lineHeight: "28px", color: brand.ink }}>
        Your week on {siteName}
      </Heading>
      <Text style={{ margin: "6px 0 0", fontSize: 14, color: brand.muted }}>
        Ranked from verified Search Console clicks. The board refreshes daily.
      </Text>

      {ranked.map((s) => (
        <RankCard key={s.siteId} s={s} siteUrl={siteUrl} benchmark={benchmarks[s.siteId]} />
      ))}

      {waiting.map((s) => (
        <Section key={s.siteId} style={{ backgroundColor: "#f7f7f8", borderRadius: 12, padding: "14px 18px", marginTop: 12 }}>
          <Text style={{ margin: 0, fontSize: 13, color: brand.muted }}>
            <span style={{ color: brand.ink, fontWeight: 600 }}>{s.name}</span> has no organic clicks in the last 28 days
            yet — it joins the board automatically the day they land.
          </Text>
        </Section>
      ))}

      {opportunity && (
        <Section style={{ border: `1px solid ${brand.line}`, borderLeft: `4px solid #f59e0b`, borderRadius: 12, padding: "16px 18px", marginTop: 20 }}>
          <Text style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#b45309" }}>
            This week&apos;s opportunity · {opportunity.siteName}
          </Text>
          <Text style={{ margin: "6px 0 0", fontSize: 15, lineHeight: "21px", fontWeight: 600, color: brand.ink }}>
            {opportunity.headline}
          </Text>
          <Text style={{ margin: "6px 0 0", fontSize: 13, lineHeight: "20px", color: brand.muted }}>{opportunity.detail}</Text>
          <Text style={{ margin: "10px 0 0", fontSize: 13 }}>
            <Link href={opportunity.href} style={{ color: brand.green, fontWeight: 600, textDecoration: "none" }}>
              See all your opportunities →
            </Link>
          </Text>
        </Section>
      )}

      {nudge && (
        <Section style={{ backgroundColor: brand.greenSoft, borderRadius: 12, padding: "16px 18px", marginTop: 20 }}>
          <Text style={{ margin: "0 0 12px", fontSize: 14, lineHeight: "20px", color: brand.ink }}>{nudge.text}</Text>
          <CtaButton href={nudge.href}>{nudge.label}</CtaButton>
        </Section>
      )}

      <Text style={{ margin: "22px 0 0", fontSize: 13 }}>
        <Link href={`${siteUrl}/leaderboard`} style={{ color: brand.green, fontWeight: 600, textDecoration: "none" }}>
          See the full board →
        </Link>
      </Text>
    </EmailLayout>
  );
}

export default WeeklyReportEmail;
