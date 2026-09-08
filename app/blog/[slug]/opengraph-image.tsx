import { ImageResponse } from "next/og";
import { getArticle, articles } from "@/lib/articles";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} article`;

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

const GREEN = "#10BF5B";
const BG = "#0a0a0b";
const MUTED = "#a1a1aa";

/** The RealRank "Cadence" mark as flex bars (Satori-friendly), dark-ground variant. */
function Mark({ unit = 12 }: { unit?: number }) {
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

/** Per-post share card so each blog post has its own title on social. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  const title = article?.title ?? `${siteConfig.name} blog`;

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
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Mark unit={11} />
          <div style={{ color: "#fff", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
            {siteConfig.name}
          </div>
          <div style={{ color: MUTED, fontSize: 26 }}>· Blog</div>
        </div>

        <div
          style={{
            display: "flex",
            color: "#fff",
            fontSize: title.length > 70 ? 52 : 62,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 1040,
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: GREEN }} />
          <div style={{ color: MUTED, fontSize: 26 }}>realrank.lol</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
