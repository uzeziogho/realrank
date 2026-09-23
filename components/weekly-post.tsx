"use client";

import { useState } from "react";
import { Copy, Check, Megaphone } from "lucide-react";
import { track } from "@/lib/track";

/**
 * "This week's post" box on /movers: the auto-generated weekly digest, ready to
 * copy and paste. Same text the cron sends to the digest webhook, so the manual
 * and automated posts read identically.
 */
export function WeeklyPostBox({ text, xIntent }: { text: string; xIntent: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      track("movers_post_copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Megaphone className="size-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider">This week&apos;s post</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        The weekly movers, written up and ready to share. Auto-posts every Monday
        when a digest webhook is connected.
      </p>

      <div className="relative mt-3">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted p-3 pr-12 text-xs text-muted-foreground">
          {text}
        </pre>
        <button
          onClick={copy}
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-accent"
          aria-label="Copy this week's post"
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <a
        href={xIntent}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("movers_post_share")}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Post to X
      </a>
    </section>
  );
}
