import { NextRequest } from "next/server";
import { getSiteProfileBySlug } from "@/lib/site";
import { siteConfig } from "@/lib/config";
import { formatCompact, formatGrowth, hostname } from "@/lib/utils";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Embeddable live rank widget — a self-contained HTML card meant to be iframed
 * on a site owner's own page:
 *   <iframe src="https://www.realrank.lol/api/embed/acme.com" .../>
 *
 * Every embed is a backlink + referral path back to RealRank (a distribution
 * loop), and it updates itself as the rank changes. Read-only, cached hourly,
 * and explicitly embeddable anywhere (frame-ancestors *).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const clean = decodeURIComponent(slug).replace(/\.html?$/i, "");
  const profile = await getSiteProfileBySlug(clean);

  const host = profile ? hostname(profile.site.siteUrl) : clean;
  const profileUrl = `${siteConfig.url}/site/${encodeURIComponent(
    (profile ? hostname(profile.site.siteUrl) : clean).toLowerCase(),
  )}?utm_source=embed&utm_medium=widget`;

  const inner = profile
    ? renderRanked(profile)
    : renderUnverified(host);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(host)} on ${siteConfig.name}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  html,body { margin:0; }
  a.card {
    display:block; text-decoration:none; width:100%; max-width:340px;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    border:1px solid #e5e7eb; border-radius:14px; padding:14px 16px; background:#ffffff; color:#0a0a0b;
  }
  @media (prefers-color-scheme: dark) {
    a.card { background:#0a0a0b; color:#fafafa; border-color:#26262a; }
    .muted { color:#a1a1aa !important; }
    .rankbox { background:#111113 !important; border-color:#26262a !important; }
  }
  .top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .brand { display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:#16a34a; }
  .dot { width:8px; height:8px; border-radius:9999px; background:#16a34a; display:inline-block; }
  .name { margin-top:8px; font-size:16px; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .muted { color:#6b7280; font-size:12px; }
  .row { margin-top:12px; display:flex; gap:10px; }
  .rankbox { flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; background:#fafafa; }
  .rankbox .k { font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
  .rankbox .v { font-size:18px; font-weight:700; margin-top:2px; }
  .up { color:#16a34a; } .down { color:#dc2626; }
  .foot { margin-top:12px; font-size:11px; }
</style>
</head>
<body>
<a class="card" href="${profileUrl}" target="_blank" rel="noopener">
  <div class="top">
    <span class="brand"><span class="dot"></span>Verified by ${siteConfig.name}</span>
  </div>
  ${inner}
  <div class="foot muted">realrank.lol · verified Google Search Console data</div>
</a>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
      // Explicitly allow embedding on any site.
      "content-security-policy": "frame-ancestors *",
    },
  });
}

function renderRanked(profile: NonNullable<Awaited<ReturnType<typeof getSiteProfileBySlug>>>): string {
  const s = profile.site;
  const host = hostname(s.siteUrl);
  const trendClass = s.growthRate > 0.005 ? "up" : s.growthRate < -0.005 ? "down" : "muted";
  return `
  <div class="name">${escapeHtml(s.displayName)}</div>
  <div class="muted">${escapeHtml(host)}</div>
  <div class="row">
    <div class="rankbox"><div class="k muted">Momentum rank</div><div class="v">#${s.rank}</div></div>
    <div class="rankbox"><div class="k muted">7-day growth</div><div class="v ${trendClass}">${escapeHtml(
      formatGrowth(s.growthRate),
    )}</div></div>
    <div class="rankbox"><div class="k muted">7d clicks</div><div class="v">${escapeHtml(
      formatCompact(s.clicks7d),
    )}</div></div>
  </div>`;
}

function renderUnverified(host: string): string {
  return `
  <div class="name">${escapeHtml(host)}</div>
  <div class="muted">Not yet verified on ${siteConfig.name}</div>
  <div class="row">
    <div class="rankbox"><div class="k muted">Status</div><div class="v">Unranked</div></div>
    <div class="rankbox"><div class="k muted">Get verified</div><div class="v up">Connect →</div></div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
