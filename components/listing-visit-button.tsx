"use client";

import { ArrowUpRight } from "lucide-react";
import { track } from "@/lib/track";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Primary "Visit <project>" button on a listing profile — a real anchor
 * (keeps the dofollow backlink for verified listings) styled as a button, with
 * a fire-and-forget beacon so outbound clicks to the project are counted.
 */
export function ListingVisitButton({
  url,
  host,
  verified,
  className,
}: {
  url: string;
  host: string;
  verified: boolean;
  className?: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel={verified ? "noopener" : "noopener nofollow"}
      onClick={() => track("listing_click", host)}
      onAuxClick={() => track("listing_click", host)}
      className={cn(buttonVariants(), className)}
    >
      Visit {host} <ArrowUpRight className="size-4" />
    </a>
  );
}
