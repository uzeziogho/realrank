"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

function parseNum(v: string): number {
  const n = Number.parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function pct(n: number): string {
  return `${Math.round(n)}%`;
}

/**
 * "Is my traffic real?" — compares a third-party ESTIMATE (SimilarWeb, Ahrefs…)
 * against VERIFIED Search Console clicks and shows the gap. Estimates are usually
 * inflated; the point is that only a verified number can be trusted — which is
 * exactly what the RealRank board shows.
 */
export function TrafficRealityCheck() {
  const [estimate, setEstimate] = useState("");
  const [clicks28, setClicks28] = useState("");

  const estMonthly = parseNum(estimate);
  const verifiedMonthly = Math.round(parseNum(clicks28) * (30 / 28)); // 28d clicks → monthly
  const hasBoth = estMonthly > 0 && verifiedMonthly > 0;

  const verdict = useMemo(() => {
    if (!hasBoth) return null;
    if (estMonthly > verifiedMonthly) {
      const over = ((estMonthly - verifiedMonthly) / estMonthly) * 100;
      return {
        tone: "over" as const,
        gap: over,
        line: `Estimates overstate your organic traffic by about ${pct(over)}.`,
      };
    }
    if (verifiedMonthly > estMonthly) {
      const under = ((verifiedMonthly - estMonthly) / verifiedMonthly) * 100;
      return {
        tone: "under" as const,
        gap: under,
        line: `You're underrated — estimates miss about ${pct(under)} of your real traffic.`,
      };
    }
    return { tone: "match" as const, gap: 0, line: "Spot on — the estimate matches your verified traffic." };
  }, [hasBoth, estMonthly, verifiedMonthly]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Estimated monthly organic visitors"
          hint="What SimilarWeb, Ahrefs or Semrush shows"
          value={estimate}
          onChange={setEstimate}
        />
        <Field
          label="Verified clicks — last 28 days"
          hint="Google Search Console → Performance → 28 days"
          value={clicks28}
          onChange={setClicks28}
        />
      </div>

      <div className="mt-6 border-t border-border pt-6">
        {verdict ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <Stat label="Estimated / mo" value={estMonthly.toLocaleString()} muted />
                <Stat label="Verified / mo" value={verifiedMonthly.toLocaleString()} />
              </div>
              <p
                className={`mt-3 text-lg font-semibold ${
                  verdict.tone === "over"
                    ? "text-danger"
                    : verdict.tone === "under"
                      ? "text-success"
                      : "text-foreground"
                }`}
              >
                {verdict.line}
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/login">
                Publish your verified number <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter both numbers to see how far your estimate is from reality.
          </p>
        )}
      </div>

      <p className="mt-5 flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <span>
          Third-party tools estimate traffic from clickstream samples and modeling —
          they&apos;re often off by 30–80%. Search Console is your own measured clicks,
          which is why RealRank ranks on it and nothing else.
        </span>
      </p>
    </div>
  );
}

function Stat({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <span>
      <span className={`text-2xl font-bold tabular-nums ${muted ? "text-muted-foreground" : "text-foreground"}`}>
        {value}
      </span>
      <span className="ml-1.5 text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 5000"
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring focus-visible:ring-2"
      />
      <span className="text-xs text-muted-foreground">{hint}</span>
    </label>
  );
}
