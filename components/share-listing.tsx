"use client";

import { track } from "@/lib/track";
import { cn } from "@/lib/utils";

/**
 * Prefilled "share your listing" buttons. A maker who just listed is the most
 * motivated sharer RealRank will ever get, and every share is free distribution
 * plus a backlink to the listing. Plain intent links (no SDKs, no tracking
 * pixels); clicks are counted first-party as share_click.
 */
export function ShareListing({
  url,
  name,
  className,
  stacked = false,
}: {
  url: string;
  name: string;
  className?: string;
  /** Always one button per row — for narrow containers like a half-width panel. */
  stacked?: boolean;
}) {
  const text = `${name} is now listed on RealRank — the directory where rank comes from verified Google traffic, not votes.`;
  const x = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  const btn =
    cn(
    // flex-1 only in row layout: in a column it overrides the h-9 height.
    "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent",
    !stacked && "sm:flex-1",
  );

  return (
    <div className={cn("flex flex-col gap-2", !stacked && "sm:flex-row", className)}>
      <a
        href={x}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("share_click", "x")}
        className={btn}
      >
        <XLogo /> Share on X
      </a>
      <a
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("share_click", "linkedin")}
        className={btn}
      >
        <LinkedInLogo /> Share on LinkedIn
      </a>
    </div>
  );
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden fill="currentColor">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}
