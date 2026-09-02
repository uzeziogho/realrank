"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

/** Copy a URL to the clipboard — for sharing an invite/recruit link. */
export function CopyLink({ url, label = "Copy link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
    >
      {copied ? <Check className="size-4 text-success" /> : <Link2 className="size-4" />}
      {copied ? "Copied" : label}
    </button>
  );
}
