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

const GREEN = "#22c55e";
const BG = "#0a0a0b";
const MUTED = "#a1a1aa";

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
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: GREEN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#04160a",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            ⌁
          </div>
          <div style={{ color: "#fff", fontSize: 30, fontWeight: 700 }}>{siteConfig.name}</div>
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
