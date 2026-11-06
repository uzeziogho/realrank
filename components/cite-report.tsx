"use client";

import { useState } from "react";
import { Copy, Check, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/track";

/**
 * "Cite this report" — the link-bait engine for the State of Indie Organic
 * Traffic report. Hands a writer a ready-to-paste citation and an embeddable
 * link, both pointing back here, so every quote of these numbers becomes a
 * backlink. Generic over the report so the same block can serve other reports.
 */
export function CiteReport({
  citation,
  embed,
  heading = "Cite this report",
  blurb = "Writing about indie SEO or organic traffic? Quote a figure and link the source. Free to use with attribution.",
}: {
  citation: string;
  embed: string;
  heading?: string;
  blurb?: string;
}) {
  const [tab, setTab] = useState<"cite" | "embed">("cite");
  const [copied, setCopied] = useState(false);
  const snippet = tab === "cite" ? citation : embed;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      track(tab === "cite" ? "report_cite_copy" : "report_embed_copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Quote className="size-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">{heading}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>

      <div className="mt-4 inline-flex rounded-lg border border-border bg-background p-1 text-sm">
        <TabButton active={tab === "cite"} onClick={() => setTab("cite")}>
          Citation
        </TabButton>
        <TabButton active={tab === "embed"} onClick={() => setTab("embed")}>
          Embed link
        </TabButton>
      </div>

      <div className="relative mt-3">
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted p-3 pr-12 text-xs text-muted-foreground">
          {snippet}
        </pre>
        <button
          onClick={copy}
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
          aria-label="Copy to clipboard"
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
