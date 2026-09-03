"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Share2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { computeMomentum } from "@/lib/momentum";
import { formatGrowth } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";

/** Qualitative read of the growth rate — the momentum story in one word. */
function grade(growth: number): { label: string; tone: "up" | "flat" | "down" } {
  if (growth >= 1) return { label: "Explosive", tone: "up" };
  if (growth >= 0.25) return { label: "Strong growth", tone: "up" };
  if (growth >= 0.05) return { label: "Growing", tone: "up" };
  if (growth > -0.05) return { label: "Flat", tone: "flat" };
  return { label: "Cooling off", tone: "down" };
}

function parseNum(v: string): number {
  const n = Number.parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Free, no-login momentum calculator. Enter your Search Console 7-day and 28-day
 * clicks and see your momentum score + growth — the same formula the RealRank
 * board uses. Funnels to connecting for a *verified* rank.
 */
export function MomentumCalculator() {
  const [d7, setD7] = useState("");
  const [d28, setD28] = useState("");

  const clicks_7d = parseNum(d7);
  const clicks_28d = parseNum(d28);
  const hasInput = d7 !== "" || d28 !== "";
  // 28-day total should include the last 7 days; warn if it doesn't.
  const inconsistent = hasInput && clicks_28d > 0 && clicks_7d > clicks_28d;

  const result = useMemo(
    () => computeMomentum({ clicks_7d, clicks_28d }),
    [clicks_7d, clicks_28d],
  );
  const g = grade(result.growthRate);
  const GradeIcon = g.tone === "up" ? TrendingUp : g.tone === "down" ? TrendingDown : Minus;

  const shareText = `My organic momentum score is ${result.momentumScore} (${formatGrowth(result.growthRate)} week-over-week) 📈 What's yours?`;
  const shareUrl = `${siteConfig.url}/momentum-score`;
  const xIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  const showResult = hasInput && !inconsistent && clicks_7d + clicks_28d > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Organic clicks — last 7 days"
          hint="Search Console → Performance → last 7 days"
          value={d7}
          onChange={setD7}
        />
        <Field
          label="Organic clicks — last 28 days"
          hint="Same report, last 28 days"
          value={d28}
          onChange={setD28}
        />
      </div>

      {inconsistent && (
        <p className="mt-3 text-sm text-danger">
          Your 28-day total should be at least your 7-day total (it includes the
          last 7 days).
        </p>
      )}

      {/* Result */}
      <div className="mt-6 border-t border-border pt-6">
        {showResult ? (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Your momentum score
              </p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="text-5xl font-bold tabular-nums">{result.momentumScore}</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium ${
                    g.tone === "up"
                      ? "bg-success/10 text-success"
                      : g.tone === "down"
                        ? "bg-danger/10 text-danger"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  <GradeIcon className="size-4" /> {g.label}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatGrowth(result.growthRate)} week-over-week ·{" "}
                {result.dailyRecent}/day now vs {result.dailyPrev}/day before
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/login">
                  Get your verified rank <ArrowRight className="size-4" />
                </Link>
              </Button>
              <a
                href={xIntent}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Share2 className="size-4" /> Share your score
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter your clicks above to see your momentum score. It updates as you type.
          </p>
        )}
      </div>

      <p className="mt-5 text-xs text-muted-foreground">
        This is an estimate from the numbers you enter. On the{" "}
        <Link href="/#leaderboard" className="text-primary hover:underline">
          leaderboard
        </Link>
        , every score is <strong className="text-foreground">verified</strong> — pulled
        straight from Google Search Console, so no one can inflate it.
      </p>
    </div>
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
        placeholder="e.g. 1200"
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring focus-visible:ring-2"
      />
      <span className="text-xs text-muted-foreground">{hint}</span>
    </label>
  );
}
