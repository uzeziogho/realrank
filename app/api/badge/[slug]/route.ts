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

  const h = 44;
  const r = 8;

  // The "Cadence" mark, dark-ground variant (white bars + green accent),
  // scaled to sit inside the dark brand segment.
  const markScale = 0.26;
  const markLeft = 12;
  const markW = Math.round(83 * markScale); // ~22
  const markGap = 9;
  const tx = markLeft - 9 * markScale;
  const ty = (h - 84 * markScale) / 2 - 6 * markScale;
  const mark = `<g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${markScale})">
    <rect x="9" y="64" width="14" height="26" rx="7" fill="#ffffff" opacity="0.55"/>
    <rect x="32" y="48" width="14" height="42" rx="7" fill="#ffffff" opacity="0.72"/>
    <rect x="55" y="30" width="14" height="60" rx="7" fill="#ffffff" opacity="0.88"/>
    <rect x="78" y="6" width="14" height="84" rx="7" fill="#10BF5B"/>
  </g>`;

  // Rough width estimation so the pill fits the mark + text. 9px/char is
  // generous enough that bold 15px text never clips or crosses the divider,
  // across the Segoe/Helvetica/Arial fallback stack.
  const brandTextW = brand.length * 9;
  const brandW = markLeft + markW + markGap + brandTextW + 12;
  const rankW = 24 + rankText.length * 9;
  const w = brandW + rankW;
  const brandTextX = markLeft + markW + markGap + brandTextW / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${brand} ${rankText}">
  <defs><clipPath id="r"><rect width="${w}" height="${h}" rx="${r}"/></clipPath></defs>
  <g clip-path="url(#r)">
    <rect width="${brandW}" height="${h}" fill="#0a0a0b"/>
    <rect x="${brandW}" width="${rankW}" height="${h}" fill="#10BF5B"/>
  </g>
  ${mark}
  <g font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="15" font-weight="700">
    <text x="${brandTextX}" y="27" fill="#ffffff" text-anchor="middle">${escapeXml(brand)}</text>
    <text x="${brandW + rankW / 2}" y="27" fill="#0B2A18" text-anchor="middle">${escapeXml(rankText)}</text>
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
