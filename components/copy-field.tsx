"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/track";

/**
 * A read-only code value with a copy button. Shared by the submit flow and the
 * listing page so the badge snippet reads identically wherever it is offered.
 * `event`, when given, is recorded on copy (e.g. "badge_copy") so the funnel
 * shows how many people take the snippet away.
 */
export function CopyField({ value, mono = false, event }: { value: string; mono?: boolean; event?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      if (event) track(event);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }
  return (
    <div className="mt-3 flex items-start gap-2">
      <code
        className={`flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 ${mono ? "truncate text-sm" : "text-xs"}`}
      >
        {value}
      </code>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}
