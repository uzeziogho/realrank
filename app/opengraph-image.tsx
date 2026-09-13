import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const alt = `${siteConfig.name} — The Organic Traffic Leaderboard`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GREEN = "#10BF5B";
const BG = "#0a0a0b";
const MUTED = "#a1a1aa";

/** The RealRank "Cadence" mark as flex bars (Satori-friendly), dark-ground variant. */
function Mark({ unit = 16 }: { unit?: number }) {
  const bars = [
    { h: 0.31, c: "rgba(255,255,255,0.55)" },
    { h: 0.5, c: "rgba(255,255,255,0.72)" },
    { h: 0.71, c: "rgba(255,255,255,0.88)" },
    { h: 1, c: GREEN },
  ];
  const tall = unit * 5;
  const w = unit * 0.85;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: unit * 0.55, height: tall }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{ width: w, height: tall * b.h, borderRadius: w / 2, background: b.c }}
        />
      ))}
    </div>
  );
}

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
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Mark unit={15} />
          <div style={{ color: "#fff", fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em" }}>
            {siteConfig.name}
          </div>
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
