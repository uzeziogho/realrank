"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/track";

/**
 * Outbound link to a listed site, recorded first-party on click.
 *
 * The href points straight at the destination rather than through
 * /visit/<host>: a redirect hop strips a verified owner's dofollow link of its
 * SEO value — that link *is* the reward — and SEO crawlers flag the hop itself
 * as a 302 redirect / spam. Clarity's own "Outbound click" smart event only
 * fires on true cross-origin anchors, so it sees these clicks but can't be
 * queried per host. Two fire-and-forget beacons close the gap without touching
 * the href or its rel: `track()` for the feature-usage report, and /api/visit
 * for the per-host site_outbound_clicks counter the redirect used to write.
 */
export function VisitLink({
  href,
  host,
  rel,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  href: string;
  host: string;
  rel: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className={className}
      aria-label={ariaLabel}
      onClick={() => {
        track("outbound_click", host);
        countVisit(host);
      }}
    >
      {children}
    </a>
  );
}

/** Per-host click count. Never throws, never blocks the navigation. */
function countVisit(host: string): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ host });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/visit", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/visit", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body,
    }).catch(() => {});
  } catch {
    /* analytics must never break a click */
  }
}
