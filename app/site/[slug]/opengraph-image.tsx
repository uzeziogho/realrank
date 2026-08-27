import { ImageResponse } from "next/og";
import { getSiteProfileBySlug } from "@/lib/site";
import { siteConfig } from "@/lib/config";
import { formatCompact, formatGrowth, hostname } from "@/lib/utils";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} rank card`;

const GREEN = "#22c55e";
const BG = "#0a0a0b";
const CARD = "#141416";
const MUTED = "#a1a1aa";

/**
 * Fetch a site's favicon as a data URI so it can be embedded in the OG image.
 * Returns null on any failure — Satori throws if a remote <img> can't load, so
 * we never hand it a URL, only inlined bytes we've confirmed we have.
 */
async function faviconDataUri(siteUrl: string): Promise<string | null> {
  try {
    const host = hostname(siteUrl);
    const res = await fetch(
      `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host)}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return null;
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getSiteProfileBySlug(slug);

  const name = profile?.site.displayName ?? siteConfig.name;
  const rank = profile ? `#${profile.site.rank}` : "";
  const total = profile ? `of ${profile.totalSites}` : "";
  const growth = profile ? formatGrowth(profile.site.growthRate) : "";
  const clicks = profile ? `${formatCompact(profile.site.clicks28d)} clicks / 28d` : "";
  const favicon = profile ? await faviconDataUri(profile.site.siteUrl) : null;
  const monogram = (name.trim()[0] ?? "?").toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: GREEN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#04160a",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            ⌁
          </div>
          <div style={{ color: "#fff", fontSize: 30, fontWeight: 700 }}>{siteConfig.name}</div>
        </div>

        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ color: MUTED, fontSize: 30 }}>Organic momentum rank</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            <div style={{ color: GREEN, fontSize: 140, fontWeight: 800, lineHeight: 1 }}>{rank}</div>
            <div style={{ color: MUTED, fontSize: 40 }}>{total}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 8 }}>
            {favicon ? (
              <img
                src={favicon}
                width={64}
                height={64}
                style={{ borderRadius: 14, background: "#fff" }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: CARD,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: MUTED,
                  fontSize: 34,
                  fontWeight: 700,
                }}
              >
                {monogram}
              </div>
            )}
            <div style={{ color: "#fff", fontSize: 52, fontWeight: 700 }}>{name}</div>
          </div>
        </div>

        {/* Footer stats */}
        <div style={{ display: "flex", gap: 16 }}>
          {growth && (
            <div style={{ display: "flex", background: CARD, borderRadius: 12, padding: "14px 22px", color: GREEN, fontSize: 30, fontWeight: 700 }}>
              {growth} growth
            </div>
          )}
          {clicks && (
            <div style={{ display: "flex", background: CARD, borderRadius: 12, padding: "14px 22px", color: "#fff", fontSize: 30 }}>
              {clicks}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
