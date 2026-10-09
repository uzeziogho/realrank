import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const alt = `${siteConfig.name} — Launch & list your project`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GREEN = "#10BF5B";
const GREEN_TEXT = "#0a9d50"; // darker green for text/contrast on white
const BG = "#ffffff";
const INK = "#0a0a0b";
const MUTED = "#52525b";
const FAINT = "#71717a";
const BORDER = "rgba(0,0,0,0.08)";
const TITLE_BAR = "#27272a";
const SUB_BAR = "rgba(0,0,0,0.11)";

const CATS = [
  { c: "#16a34a", label: "SaaS" },
  { c: "#0284c7", label: "AI" },
  { c: "#d97706", label: "Dev Tools" },
];

/** The RealRank "Cadence" mark as flex bars (Satori-friendly), light-ground variant. */
function Mark({ unit = 14 }: { unit?: number }) {
  const bars = [
    { h: 0.31, c: "rgba(0,0,0,0.25)" },
    { h: 0.5, c: "rgba(0,0,0,0.4)" },
    { h: 0.71, c: "rgba(0,0,0,0.55)" },
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

/** One directory listing row: favicon tile, name + tagline bars, category pill. */
function ListRow({ color, label, nameW, subW }: { color: string; label: string; nameW: number; subW: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", borderRadius: 14, border: `1px solid ${BORDER}` }}>
      <div
        style={{
          display: "flex",
          width: 38,
          height: 38,
          borderRadius: 11,
          background: `${color}22`,
          border: `1px solid ${color}55`,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 8 }}>
        <div style={{ display: "flex", width: `${nameW}%`, height: 12, borderRadius: 6, background: TITLE_BAR }} />
        <div style={{ display: "flex", width: `${subW}%`, height: 8, borderRadius: 5, background: SUB_BAR }} />
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
        {label}
      </div>
    </div>
  );
}

/**
 * Default social-share card (also used for Twitter/X). Light theme, focused on
 * the launch + directory: list your project free and get discovered. Shows a
 * mini directory on the right. Per-site profiles override this.
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
            "radial-gradient(900px 440px at 12% -12%, rgba(16,191,91,0.14), rgba(16,191,91,0) 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 56 }}>
          {/* Left: brand + message */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Mark unit={14} />
              <div style={{ color: INK, fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em" }}>
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
                  border: "1px solid rgba(16,191,91,0.45)",
                  background: "rgba(16,191,91,0.1)",
                }}
              >
                <div style={{ display: "flex", width: 9, height: 9, borderRadius: 999, background: GREEN }} />
                <div style={{ color: GREEN_TEXT, fontSize: 17, fontWeight: 700, letterSpacing: "0.02em" }}>
                  FREE TO LIST
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 38,
                color: INK,
                fontSize: 62,
                fontWeight: 800,
                lineHeight: 1.03,
                letterSpacing: "-0.03em",
                maxWidth: 560,
              }}
            >
              Launch your project. Get discovered.
            </div>

            <div style={{ display: "flex", marginTop: 24, color: MUTED, fontSize: 26, lineHeight: 1.3, maxWidth: 540 }}>
              List free on the {siteConfig.name} directory — a permanent link in seconds, no account.
              Then climb the verified momentum board.
            </div>

            <div style={{ display: "flex", marginTop: "auto", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", width: 10, height: 10, borderRadius: 999, background: GREEN }} />
              <div style={{ color: FAINT, fontSize: 25, fontWeight: 500 }}>realrank.lol/submit</div>
            </div>
          </div>

          {/* Right: mini directory */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 430,
              padding: 24,
              gap: 10,
              borderRadius: 26,
              background: "#fafafa",
              border: `1px solid ${BORDER}`,
              boxShadow: "0 24px 70px rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", width: 9, height: 9, borderRadius: 999, background: GREEN }} />
                <div style={{ color: INK, fontSize: 22, fontWeight: 600 }}>Just listed</div>
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
                Directory
              </div>
            </div>

            <ListRow color={CATS[0].c} label={CATS[0].label} nameW={62} subW={88} />
            <ListRow color={CATS[1].c} label={CATS[1].label} nameW={52} subW={76} />
            <ListRow color={CATS[2].c} label={CATS[2].label} nameW={70} subW={84} />

            {/* CTA ghost row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px",
                borderRadius: 14,
                border: "1px dashed rgba(16,191,91,0.5)",
                background: "rgba(16,191,91,0.06)",
                color: GREEN_TEXT,
                fontSize: 19,
                fontWeight: 600,
              }}
            >
              + List your project — free
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
