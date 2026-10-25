import { NextResponse } from "next/server";
import { normalizeHost, getListedSites } from "@/lib/listed";

export const runtime = "nodejs";

const TIMEOUT_MS = 8000;
const MAX_BYTES = 512 * 1024;

/**
 * Preview-image proxy for directory listings. Given ?host=, fetches the site's
 * homepage, pulls its og:image / twitter:image, and 302-redirects to it (the
 * browser loads the image from the origin — we never stream the bytes). Results
 * cache at the edge, so each host is fetched once. Only hosts we actually list
 * are allowed, so this can't be used as an open OG-fetch proxy; the fetch is
 * bounded (timeout + size cap) and reads raw HTML only. No image found → 404,
 * and the card falls back to its branded favicon placeholder.
 */
function extractOgImage(html: string, base: string): string | null {
  const res = [
    /<meta[^>]+(?:property|name)=["'](?:og:image(?::url)?|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::url)?|twitter:image(?::src)?)["']/i,
  ];
  for (const re of res) {
    const m = html.match(re);
    if (m?.[1]) {
      try {
        return new URL(m[1], base).toString();
      } catch {
        /* malformed content URL — keep looking */
      }
    }
  }
  return null;
}

const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" };

export async function GET(req: Request) {
  const host = normalizeHost(new URL(req.url).searchParams.get("host") ?? "");
  if (!host) return new NextResponse(null, { status: 400 });

  // Only ever preview sites we actually list — never an open fetch proxy.
  const listed = new Set((await getListedSites()).map((s) => s.host));
  if (!listed.has(host)) return new NextResponse(null, { status: 404, headers: CACHE_HEADERS });

  const pageUrl = `https://${host}/`;
  try {
    const res = await fetch(pageUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "RealRankBot/1.0 (+https://realrank.lol)" },
    });
    if (!res.ok) return new NextResponse(null, { status: 404, headers: CACHE_HEADERS });
    const buf = await res.arrayBuffer();
    const html = new TextDecoder().decode(buf.slice(0, MAX_BYTES));
    const img = extractOgImage(html, pageUrl);
    if (!img || !/^https?:\/\//i.test(img)) return new NextResponse(null, { status: 404, headers: CACHE_HEADERS });
    return new NextResponse(null, { status: 302, headers: { Location: img, ...CACHE_HEADERS } });
  } catch {
    return new NextResponse(null, { status: 404, headers: CACHE_HEADERS });
  }
}
