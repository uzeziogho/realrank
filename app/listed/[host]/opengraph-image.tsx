import { ImageResponse } from "next/og";
import { getListingByHost, normalizeHost } from "@/lib/listed";
import { getOutboundClicks } from "@/lib/data";
import { categoryLabel, siteConfig, VISITS_FLOOR } from "@/lib/config";
import { formatCompact, hostname } from "@/lib/utils";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} listing card`;

const GREEN = "#10BF5B";
const BG = "#0a0a0b";
const CARD = "#141416";
const MUTED = "#a1a1aa";

/** The RealRank "Cadence" mark as flex bars (Satori-friendly), dark-ground variant. */
function Mark({ unit = 10 }: { unit?: number }) {
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
 * Fetch a site's favicon as a data URI so it can be embedded in the OG image.
 * Returns null on any failure — Satori throws if a remote <img> can't load, so
 * we never hand it a URL, only inlined bytes we've confirmed we have.
 */
async function faviconDataUri(siteUrl: string): Promise<string | null> {
  try {
    const host = hostname(siteUrl);
    const res = await fetch(
      `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host)}`,
      { signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) return null;
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ host: string }> }) {
  const { host: raw } = await params;
  const host = normalizeHost(raw) ?? raw;
  const listing = await getListingByHost(host);

  const name = listing?.displayName ?? siteConfig.name;
  const rawTagline = listing?.tagline ?? siteConfig.description;
  const tagline = rawTagline.length > 108 ? `${rawTagline.slice(0, 107)}…` : rawTagline;
  const category = listing?.category ? categoryLabel(listing.category) : null;
  const verified = listing?.ownerVerified ?? false;
  const favicon = listing ? await faviconDataUri(listing.siteUrl) : null;
  const monogram = (name.trim()[0] ?? "?").toUpperCase();

  let visits = 0;
  try {
    visits = (await getOutboundClicks()).get(host) ?? 0;
  } catch {
    visits = 0;
  }
  const showVisits = visits >= VISITS_FLOOR;

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
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Mark unit={10} />
            <div style={{ color: "#fff", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
              {siteConfig.name}
            </div>
          </div>
          <div style={{ display: "flex", color: MUTED, fontSize: 24, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Directory
          </div>
        </div>

        {/* Main — favicon + name + tagline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {favicon ? (
              <img src={favicon} width={88} height={88} style={{ borderRadius: 20, background: "#fff" }} />
            ) : (
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 20,
                  background: CARD,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: MUTED,
                  fontSize: 44,
                  fontWeight: 700,
                }}
              >
                {monogram}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ color: "#fff", fontSize: 60, fontWeight: 800, letterSpacing: "-0.02em" }}>{name}</div>
                {verified && (
                  <div
                    style={{
                      display: "flex",
                      background: "rgba(16,191,91,0.15)",
                      color: GREEN,
                      fontSize: 24,
                      fontWeight: 700,
                      padding: "8px 16px",
                      borderRadius: 999,
                    }}
                  >
                    Owner-verified
                  </div>
                )}
              </div>
              <div style={{ display: "flex", color: MUTED, fontSize: 26 }}>{host}</div>
            </div>
          </div>
          <div style={{ display: "flex", color: "#e4e4e7", fontSize: 36, lineHeight: 1.35, maxWidth: 1000 }}>
            {tagline}
          </div>
        </div>

        {/* Footer — category + visits */}
        <div style={{ display: "flex", gap: 16 }}>
          {category && (
            <div style={{ display: "flex", background: CARD, borderRadius: 12, padding: "14px 22px", color: "#fff", fontSize: 28 }}>
              {category}
            </div>
          )}
          {showVisits && (
            <div style={{ display: "flex", background: CARD, borderRadius: 12, padding: "14px 22px", color: GREEN, fontSize: 28, fontWeight: 700 }}>
              {formatCompact(visits)} visits sent
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", marginLeft: "auto", color: MUTED, fontSize: 26 }}>
            List free · earn a verified rank
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
