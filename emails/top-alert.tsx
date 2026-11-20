import { Heading, Link, Section, Text } from "@react-email/components";
import { EmailLayout, TrendBars, CtaButton, brand } from "./layout";
import type { OwnerSiteLine } from "@/lib/comeback";

/** "Your site is #1": the alert worth celebrating, with sharing up front. */

export interface TopAlertProps {
  siteUrl: string;
  siteName: string;
  site: OwnerSiteLine;
  from: number | null;
  shareUrl: string;
  nudge: { text: string; href: string; label: string } | null;
  unsubscribeUrl: string;
}

const pct = (g: number) => `${g > 0 ? "+" : g < 0 ? "−" : ""}${Math.abs(Math.round(g * 100))}%`;

export function TopAlertEmail({ siteUrl, siteName, site, from, shareUrl, nudge, unsubscribeUrl }: TopAlertProps) {
  return (
    <EmailLayout
      preview={`${site.name} is the fastest-growing verified site on ${siteName} right now.`}
      siteUrl={siteUrl}
      siteName={siteName}
      eyebrow="Rank alert"
      reason={`You're getting this because you connected Search Console to ${siteName}. Rank alerts come at most every 3 days.`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section style={{ textAlign: "center", backgroundColor: brand.greenSoft, borderRadius: 12, padding: "26px 16px 22px" }}>
        <div style={{ fontSize: 64, lineHeight: "64px", fontWeight: 800, color: brand.green, letterSpacing: "-2px" }}>#1</div>
        <Text style={{ margin: "8px 0 0", fontSize: 13, color: brand.muted }}>
          of {site.total} on the momentum board{from ? ` · up from #${from}` : ""}
        </Text>
      </Section>

      <Heading as="h1" style={{ margin: "22px 0 0", fontSize: 22, lineHeight: "28px", color: brand.ink }}>
        {site.name} is #1 on {siteName}
      </Heading>
      <Text style={{ margin: "8px 0 0", fontSize: 15, lineHeight: "22px", color: brand.ink }}>
        It&apos;s the fastest-growing verified site on the board right now: {pct(site.growth)} momentum and{" "}
        {site.clicks7d.toLocaleString("en-US")} organic clicks in the last 7 days, straight from Search Console.
      </Text>
      {site.spark && <TrendBars values={site.spark.slice(-14)} label="Daily organic clicks, last 14 days" />}

      <Section style={{ marginTop: 22 }}>
        <CtaButton href={shareUrl}>Share it on X</CtaButton>
        <Link
          href={`${siteUrl}/site/${site.host}`}
          style={{ display: "inline-block", marginLeft: 14, fontSize: 14, fontWeight: 600, color: brand.green, textDecoration: "none" }}
        >
          See your profile →
        </Link>
      </Section>

      {nudge && (
        <Text style={{ margin: "22px 0 0", fontSize: 13, lineHeight: "20px", color: brand.muted }}>
          {nudge.text}{" "}
          <Link href={nudge.href} style={{ color: brand.green, fontWeight: 600, textDecoration: "none" }}>
            {nudge.label} →
          </Link>
        </Text>
      )}
    </EmailLayout>
  );
}

export default TopAlertEmail;
