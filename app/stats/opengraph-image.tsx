import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config";
import { getStatsData } from "@/lib/stats";
import { formatGrowth } from "@/lib/utils";

export const runtime = "nodejs";
export const alt = "The RealRank Index — verified organic search benchmark";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GREEN = "#10BF5B";
const RED = "#f2555a";
const BG = "#0a0a0b";
const MUTED = "#a1a1aa";

/** The RealRank "Cadence" mark as flex bars (Satori-friendly), dark-ground variant. */
function Mark({ unit = 14 }: { unit?: number }) {
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
        <div key={i} style={{ width: w, height: tall * b.h, borderRadius: w / 2, background: b.c }} />
      ))}
    </div>
  );
}

/**
 * Social-share card for /stats: the live Index number IS the thumbnail, so a
 * shared link leads with the stat itself (much higher CTR than a generic card).
 * Regenerated on the page's revalidate cadence.
 */
export default async function Image() {
  let index = 100;
  let growingPct = 0;
  let decliningPct = 0;
  let medianGrowth = 0;
  let period = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  try {
    const s = await getStatsData();
    index = s.index;
    growingPct = s.growingPct;
    decliningPct = s.decliningPct;
    medianGrowth = s.medianGrowth;
    period = new Date(s.lastUpdated ?? Date.now()).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  } catch {
    /* fall back to neutral defaults */
  }
  const tone = medianGrowth > 0.005 ? GREEN : medianGrowth < -0.005 ? RED : "#ffffff";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Mark unit={14} />
          <div style={{ color: "#fff", fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em" }}>
            {`The ${siteConfig.name} Index`}
          </div>
        </div>

        <div style={{ marginTop: 30, color: tone, fontSize: 240, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.04em" }}>
          {String(index)}
        </div>

        <div style={{ marginTop: 6, color: MUTED, fontSize: 36, fontWeight: 600 }}>
          {`100 = flat  ·  ${period}`}
        </div>

        <div style={{ marginTop: 34, color: "#fff", fontSize: 36, fontWeight: 600 }}>
          {`${growingPct}% growing  ·  ${decliningPct}% declining  ·  ${formatGrowth(medianGrowth)} median WoW`}
        </div>

        <div style={{ marginTop: "auto", color: MUTED, fontSize: 26 }}>
          {"Verified Google Search Console clicks · realrank.lol/stats"}
        </div>
      </div>
    ),
    { ...size },
  );
}
