"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * Copy-paste embed for the "Ranked on RealRank" badge. Site owners drop this on
 * their site — it links back to their RealRank profile (distribution + SEO).
 */
export function BadgeEmbed({ profileUrl, badgeUrl }: { profileUrl: string; badgeUrl: string }) {
  const [copied, setCopied] = useState(false);

  const snippet = `<a href="${profileUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="Ranked on RealRank" width="200" height="44" />
</a>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={badgeUrl} alt="RealRank badge preview" width={200} height={44} />
      </div>
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg border border-border bg-muted p-3 pr-12 text-xs text-muted-foreground">
          {snippet}
        </pre>
        <button
          onClick={copy}
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
          aria-label="Copy embed code"
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
