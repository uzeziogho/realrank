"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Normalize any domain-ish input to a bare lowercase hostname. */
function normalize(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .trim();
}

/** Domain input that routes to /report-card/[domain]. */
export function ReportCardForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const domain = normalize(value);
    if (domain) router.push(`/report-card/${encodeURIComponent(domain)}`);
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <input
        type="text"
        inputMode="url"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="yourdomain.com"
        aria-label="Your domain"
        className="h-11 w-full rounded-lg border border-input bg-background px-4 text-sm outline-none ring-ring focus-visible:ring-2"
      />
      <Button type="submit" size="lg" className="shrink-0">
        Get report card <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
