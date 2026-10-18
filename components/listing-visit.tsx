"use client";

import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/track";

/**
 * Outbound "visit" link for a listed project. A real anchor (keeps the
 * dofollow backlink for owner-verified listings — that's part of the listing's
 * value, so we never route it through a redirect), with a fire-and-forget
 * beacon so we can count the clicks RealRank sends each project.
 */
export function ListingVisit({
  url,
  host,
  name,
  verified,
}: {
  url: string;
  host: string;
  name: string;
  verified: boolean;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel={verified ? "noopener" : "noopener nofollow"}
      onClick={() => track("listing_click", host)}
      onAuxClick={() => track("listing_click", host)}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors group-hover:border-primary/40 hover:bg-accent hover:text-foreground"
      aria-label={`Visit ${name}`}
    >
      <ArrowUpRight className="size-4" />
    </a>
  );
}
