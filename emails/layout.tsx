import type { ReactNode } from "react";
import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";

/**
 * Shared frame for RealRank's designed emails (React Email). Inline styles
 * only — they're what every inbox honours — in the site's light palette.
 * Every designed email is sent with a plain-text version alongside it.
 */

export const brand = {
  green: "#1eae53",
  greenSoft: "#ecf8f0",
  ink: "#0a0a0b",
  muted: "#6b6b76",
  line: "#e6e6ea",
  page: "#f4f4f5",
  red: "#dc2828",
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

export function EmailLayout({
  preview,
  siteUrl,
  siteName,
  eyebrow,
  reason,
  unsubscribeUrl,
  children,
}: {
  preview: string;
  siteUrl: string;
  siteName: string;
  /** Small label beside the logo, e.g. "Weekly report · Nov 30". */
  eyebrow: string;
  /** Why they're getting this, shown above the unsubscribe link. */
  reason: string;
  unsubscribeUrl: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: brand.page, fontFamily: brand.font, margin: 0, padding: "24px 12px" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto" }}>
          <Section style={{ padding: "0 4px 14px" }}>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
              <tbody>
                <tr>
                  <td>
                    <Link href={siteUrl} style={{ textDecoration: "none", color: brand.ink }}>
                      <Img
                        src={`${siteUrl}/logo-120.png`}
                        width="26"
                        height="26"
                        alt=""
                        style={{ display: "inline-block", verticalAlign: "middle", borderRadius: 6 }}
                      />
                      <span style={{ fontSize: 17, fontWeight: 700, verticalAlign: "middle", marginLeft: 8 }}>{siteName}</span>
                    </Link>
                  </td>
                  <td align="right" style={{ fontSize: 12, color: brand.muted }}>
                    {eyebrow}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section
            style={{ backgroundColor: "#ffffff", border: `1px solid ${brand.line}`, borderRadius: 14, padding: "28px 28px 24px" }}
          >
            {children}
          </Section>

          <Section style={{ padding: "18px 8px 0" }}>
            <Text style={{ fontSize: 12, lineHeight: "18px", color: brand.muted, margin: 0 }}>
              {reason}
            </Text>
            <Hr style={{ borderColor: brand.line, margin: "12px 0" }} />
            <Text style={{ fontSize: 12, lineHeight: "18px", color: brand.muted, margin: 0 }}>
              <Link href={siteUrl} style={{ color: brand.muted }}>
                {siteUrl.replace(/^https?:\/\//, "")}
              </Link>
              {" · "}
              <Link href={unsubscribeUrl} style={{ color: brand.muted }}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/** Mini bar chart of daily clicks — table cells, so it renders in every inbox (no SVG). */
export function TrendBars({ values, label }: { values: number[]; label: string }) {
  if (values.length < 3 || Math.max(...values) <= 0) return null;
  const max = Math.max(...values);
  const H = 36;
  return (
    <table cellPadding={0} cellSpacing={0} role="img" aria-label={label} style={{ marginTop: 14 }}>
      <tbody>
        <tr style={{ verticalAlign: "bottom" }}>
          {values.map((v, i) => {
            const h = Math.max(2, Math.round((v / max) * H));
            const last = i >= values.length - 7;
            return (
              <td key={i} style={{ paddingRight: 3, verticalAlign: "bottom", height: H }}>
                <div
                  style={{
                    width: 12,
                    height: h,
                    lineHeight: `${h}px`,
                    fontSize: 1,
                    backgroundColor: last ? brand.green : "#c9ead5",
                    borderRadius: 2,
                  }}
                >
                  &nbsp;
                </div>
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}

/** The green call-to-action button. */
export function CtaButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: brand.green,
        color: "#ffffff",
        fontSize: 14,
        fontWeight: 600,
        textDecoration: "none",
        padding: "11px 18px",
        borderRadius: 8,
      }}
    >
      {children}
    </Button>
  );
}
