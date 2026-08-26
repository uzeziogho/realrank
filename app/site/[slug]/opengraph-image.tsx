import { ImageResponse } from "next/og";
import { getSiteProfileBySlug } from "@/lib/site";
import { siteConfig } from "@/lib/config";
import { formatCompact, formatGrowth } from "@/lib/utils";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} rank card`;

const GREEN = "#22c55e";
const BG = "#0a0a0b";
const CARD = "#141416";
const MUTED = "#a1a1aa";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const profile = await getSiteProfileBySlug(slug);

  const name = profile?.site.displayName ?? siteConfig.name;
  const rank = profile ? `#${profile.site.rank}` : "";
  const total = profile ? `of ${profile.totalSites}` : "";
  const growth = profile ? formatGrowth(profile.site.growthRate) : "";
  const clicks = profile ? `${formatCompact(profile.site.clicks28d)} clicks / 28d` : "";

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
          <div style={{ color: "#fff", fontSize: 52, fontWeight: 700, marginTop: 8 }}>{name}</div>
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
