import { NextRequest } from "next/server";
import { getSiteProfileBySlug } from "@/lib/site";
import { siteConfig } from "@/lib/config";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * SVG rank badge for embedding on a site owner's own page, e.g.:
 *   <img src="https://www.realrank.lol/api/badge/acme.com.svg">
 * Two-tone pill: "RealRank" (dark) + "#N Momentum" (green).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const clean = slug.replace(/\.svg$/i, "");
  const profile = await getSiteProfileBySlug(clean);

  const rankText = profile ? `#${profile.site.rank} Momentum` : "Ranked";
  const brand = siteConfig.name;

  // Rough width estimation so the pill fits the text.
  const brandW = 20 + brand.length * 8;
  const rankW = 20 + rankText.length * 8;
  const w = brandW + rankW;
  const h = 44;
  const r = 8;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${brand} ${rankText}">
  <defs><clipPath id="r"><rect width="${w}" height="${h}" rx="${r}"/></clipPath></defs>
  <g clip-path="url(#r)">
    <rect width="${brandW}" height="${h}" fill="#0a0a0b"/>
    <rect x="${brandW}" width="${rankW}" height="${h}" fill="#22c55e"/>
  </g>
  <g font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="15" font-weight="700">
    <text x="${brandW / 2}" y="27" fill="#ffffff" text-anchor="middle">${escapeXml(brand)}</text>
    <text x="${brandW + rankW / 2}" y="27" fill="#04160a" text-anchor="middle">${escapeXml(rankText)}</text>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c] as string,
  );
}
