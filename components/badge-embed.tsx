"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Copy-paste embeds for a site's RealRank presence — a static badge (image) and
 * a live widget (iframe). Both link back to the profile (distribution + SEO) and
 * update themselves as the rank changes.
 */
export function BadgeEmbed({
  profileUrl,
  badgeUrl,
  embedUrl,
}: {
  profileUrl: string;
  badgeUrl: string;
  embedUrl?: string;
}) {
  const [tab, setTab] = useState<"badge" | "widget">("badge");
  const [copied, setCopied] = useState(false);

  const badgeSnippet = `<a href="${profileUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="Ranked on RealRank" width="200" height="44" />
</a>`;

  const widgetSnippet = `<iframe src="${embedUrl}" width="340" height="180" title="Ranked on RealRank" loading="lazy" style="border:0;overflow:hidden;max-width:100%"></iframe>`;

  const showWidget = tab === "widget" && embedUrl;
  const snippet = showWidget ? widgetSnippet : badgeSnippet;

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
      {embedUrl && (
        <div className="inline-flex rounded-lg border border-border bg-card p-1 text-sm">
          <TabButton active={tab === "badge"} onClick={() => setTab("badge")}>
            Badge
          </TabButton>
          <TabButton active={tab === "widget"} onClick={() => setTab("widget")}>
            Live widget
          </TabButton>
        </div>
      )}

      <div className="flex items-center gap-3">
        {showWidget ? (
          <iframe
            src={embedUrl}
            width={340}
            height={180}
            title="RealRank widget preview"
            loading="lazy"
            className="max-w-full overflow-hidden rounded-xl border-0"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={badgeUrl} alt="RealRank badge preview" width={200} height={44} />
        )}
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1 font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
