"use client";

import type { ReactNode } from "react";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

/**
 * A call-to-action on the Archive validation page that records which plan was
 * clicked (first-party /api/event), so interest can be measured before anything
 * is built. With a checkout URL it opens payment in a new tab; without one it
 * scrolls to the waitlist, so the page works before a payment link exists.
 */
export function ArchiveCta({
  href,
  plan,
  variant = "primary",
  className,
  children,
}: {
  /** Payment link (e.g. a Dodo checkout URL), or null to fall back to the waitlist. */
  href: string | null;
  plan: string;
  variant?: "primary" | "outline";
  className?: string;
  children: ReactNode;
}) {
  const external = Boolean(href);
  return (
    <a
      href={href ?? "#waitlist"}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      onClick={() => track(external ? "archive_checkout_click" : "archive_reserve_click", plan)}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors",
        variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-input bg-background text-foreground hover:bg-accent",
        className,
      )}
    >
      {children}
    </a>
  );
}
