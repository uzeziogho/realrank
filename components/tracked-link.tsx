"use client";

import type { AnchorHTMLAttributes } from "react";
import { track } from "@/lib/track";

/**
 * A plain <a> that records a first-party analytics event on click. For links a
 * Server Component renders but still needs to count — e.g. the sponsor mailto,
 * which is otherwise invisible in the funnel.
 */
export function TrackedLink({
  event,
  label,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { event: string; label?: string }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        track(event, label);
        onClick?.(e);
      }}
    />
  );
}
