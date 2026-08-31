import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const alt = `${siteConfig.name} — The Organic Traffic Leaderboard`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GREEN = "#22c55e";
const BG = "#0a0a0b";
const MUTED = "#a1a1aa";

/**
 * Default social-share card for the whole site (home, blog, categories, etc.).
 * Generated at runtime so there's always a real image — previously the metadata
 * pointed at /og.png, which didn't exist, so link previews showed no logo.
 * Per-site profiles override this with their own opengraph-image.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: BG,
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: GREEN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#04160a",
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            ⌁
          </div>
          <div style={{ color: "#fff", fontSize: 40, fontWeight: 700 }}>{siteConfig.name}</div>
        </div>

        <div
          style={{
            marginTop: 40,
            color: "#fff",
            fontSize: 68,
            fontWeight: 800,
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          The organic traffic leaderboard for the whole web
        </div>

        <div style={{ marginTop: 28, color: MUTED, fontSize: 30, maxWidth: 900 }}>
          Verified Google Search Console clicks. Ranked by momentum, so fast-growing
          sites beat the giants.
        </div>

        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: GREEN }} />
          <div style={{ color: MUTED, fontSize: 26 }}>realrank.lol</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
