"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/track";

/**
 * Outbound link to a listed site, recorded first-party on click.
 *
 * Listing pages link straight at the destination rather than through
 * /visit/<host>, because the redirect hop would strip a verified owner's
 * dofollow link of its SEO value — that link *is* the reward. The trade-off is
 * that these clicks never reach `bump_outbound_click`, and Clarity's own
 * "Outbound click" smart event is no help either: it only fires on true
 * cross-origin anchors, so it sees listing-page clicks but not the board's
 * same-origin /visit ones. A `track()` call closes the gap without touching
 * the href or its rel.
 */
export function VisitLink({
  href,
  host,
  rel,
  className,
  children,
}: {
  href: string;
  host: string;
  rel: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={rel}
      className={className}
      onClick={() => track("outbound_click", host)}
    >
      {children}
    </a>
  );
}
