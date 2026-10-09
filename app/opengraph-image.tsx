import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const alt = `${siteConfig.name} — The Organic Traffic Leaderboard`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GREEN = "#10BF5B";
const BG = "#0a0a0b";
const CARD = "#111113";
const BORDER = "rgba(255,255,255,0.08)";
const MUTED = "#a1a1aa";
const FAINT = "rgba(255,255,255,0.55)";

/** The RealRank "Cadence" mark as flex bars (Satori-friendly), dark-ground variant. */
function Mark({ unit = 15 }: { unit?: number }) {
  const bars = [
    { h: 0.31, c: "rgba(255,255,255,0.5)" },
    { h: 0.5, c: "rgba(255,255,255,0.68)" },
    { h: 0.71, c: "rgba(255,255,255,0.85)" },
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

/** One row of the mock momentum board: rank chip, momentum bar, growth pill. */
function BoardRow({
  rank,
  fill,
  growth,
  top = false,
}: {
  rank: number;
  fill: number;
  growth: string;
  top?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "11px 14px",
        borderRadius: 14,
        background: top ? "rgba(16,191,91,0.12)" : "transparent",
        border: top ? "1px solid rgba(16,191,91,0.28)" : "1px solid transparent",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 11,
          fontSize: 19,
          fontWeight: 700,
          color: top ? GREEN : MUTED,
          background: top ? "rgba(16,191,91,0.22)" : "rgba(255,255,255,0.06)",
        }}
      >
        {rank}
      </div>
      {/* momentum bar */}
      <div
        style={{
          display: "flex",
          flex: 1,
          height: 14,
          borderRadius: 7,
          background: "rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            width: `${fill}%`,
            height: 14,
            borderRadius: 7,
            backgroundImage: `linear-gradient(90deg, rgba(16,191,91,0.65), ${GREEN})`,
          }}
        />
      </div>
      <div style={{ display: "flex", width: 86, justifyContent: "flex-end", fontSize: 19, fontWeight: 600, color: GREEN }}>
        {growth}
      </div>
    </div>
  );
}

/**
 * Default social-share card for the whole site (home, blog, categories, etc.).
 * Generated at runtime so there's always a real image. Styled to match the app:
 * dark ground, the signature green glow, the brand mark, a GSC-verified chip, and
 * a mini live-momentum board. Per-site profiles override this with their own.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          padding: 72,
          background: BG,
          backgroundImage:
            "radial-gradient(900px 440px at 12% -12%, rgba(16,191,91,0.20), rgba(16,191,91,0) 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 56 }}>
          {/* Left: brand + message */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Mark unit={14} />
              <div style={{ color: "#fff", fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em" }}>
                {siteConfig.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  marginLeft: 6,
                  padding: "7px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(16,191,91,0.4)",
                  background: "rgba(16,191,91,0.1)",
                }}
              >
                <div style={{ display: "flex", width: 9, height: 9, borderRadius: 999, background: GREEN }} />
                <div style={{ color: GREEN, fontSize: 17, fontWeight: 600, letterSpacing: "0.02em" }}>
                  GSC-VERIFIED
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 38,
                color: "#fff",
                fontSize: 64,
                fontWeight: 800,
                lineHeight: 1.03,
                letterSpacing: "-0.03em",
                maxWidth: 560,
              }}
            >
              The organic-growth leaderboard.
            </div>

            <div style={{ display: "flex", marginTop: 24, color: MUTED, fontSize: 26, lineHeight: 1.3, maxWidth: 540 }}>
              Ranked by verified Google Search Console clicks — momentum, not estimates. You can&apos;t
              fake it, and you can&apos;t buy it.
            </div>

            <div style={{ display: "flex", marginTop: "auto", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, background: GREEN }} />
              <div style={{ color: FAINT, fontSize: 25, fontWeight: 500 }}>realrank.lol</div>
            </div>
          </div>

          {/* Right: mini momentum board */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 430,
              padding: 26,
              gap: 10,
              borderRadius: 26,
              background: CARD,
              border: `1px solid ${BORDER}`,
              boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", width: 9, height: 9, borderRadius: 999, background: GREEN }} />
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 600 }}>Momentum</div>
              </div>
              <div
                style={{
                  display: "flex",
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: `1px solid ${BORDER}`,
                  color: MUTED,
                  fontSize: 16,
                }}
              >
                7-day
              </div>
            </div>
            <BoardRow rank={1} fill={94} growth="+312%" top />
            <BoardRow rank={2} fill={70} growth="+188%" />
            <BoardRow rank={3} fill={55} growth="+124%" />
            <BoardRow rank={4} fill={41} growth="+86%" />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
