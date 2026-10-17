"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A read-only code value with a copy button. Shared by the submit flow and the
 * listing page so the badge snippet reads identically wherever it is offered.
 */
export function CopyField({ value, mono = false }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
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
