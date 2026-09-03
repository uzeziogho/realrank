"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";
import { computeMomentum } from "@/lib/momentum";
import { formatGrowth } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";

/** Letter grade from week-over-week growth of the daily click rate. */
function letterGrade(growth: number): { grade: string; blurb: string; tone: "up" | "flat" | "down" } {
  if (growth >= 1) return { grade: "A+", blurb: "Explosive — your traffic is compounding fast.", tone: "up" };
  if (growth >= 0.5) return { grade: "A", blurb: "Excellent — clearly accelerating.", tone: "up" };
  if (growth >= 0.2) return { grade: "B", blurb: "Solid growth — keep the content coming.", tone: "up" };
  if (growth >= 0.05) return { grade: "C", blurb: "Growing slowly — room to push harder.", tone: "up" };
  if (growth > -0.05) return { grade: "D", blurb: "Flat — traffic is holding, not building.", tone: "flat" };
  return { grade: "F", blurb: "Declining — momentum is slipping. Time to act.", tone: "down" };
}

function parseNum(v: string): number {
  const n = Number.parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * "Rate my organic growth" — a shareable letter-grade report card from your
 * 7-day and 28-day Search Console clicks. Built to be screenshot-and-post
 * friendly; funnels to a verified grade on the board.
 */
export function GrowthGrader() {
  const [d7, setD7] = useState("");
  const [d28, setD28] = useState("");

  const clicks_7d = parseNum(d7);
  const clicks_28d = parseNum(d28);
  const hasInput = d7 !== "" || d28 !== "";
  const inconsistent = hasInput && clicks_28d > 0 && clicks_7d > clicks_28d;
  const showResult = hasInput && !inconsistent && clicks_7d + clicks_28d > 0;

  const { momentumScore, growthRate } = useMemo(
    () => computeMomentum({ clicks_7d, clicks_28d }),
    [clicks_7d, clicks_28d],
  );
  const g = letterGrade(growthRate);

  const shareText = `My organic growth grade is ${g.grade} (${formatGrowth(growthRate)} week-over-week) 📈 Grade yours:`;
  const shareUrl = `${siteConfig.url}/organic-growth-grade`;
  const xIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  const gradeColor =
    g.tone === "up" ? "text-success" : g.tone === "down" ? "text-danger" : "text-muted-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organic clicks — last 7 days" value={d7} onChange={setD7} />
        <Field label="Organic clicks — last 28 days" value={d28} onChange={setD28} />
      </div>

      {inconsistent && (
        <p className="mt-3 text-sm text-danger">
          Your 28-day total should be at least your 7-day total.
        </p>
      )}

      <div className="mt-6 border-t border-border pt-6">
        {showResult ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className={`flex size-28 items-center justify-center rounded-2xl border-2 ${
                g.tone === "up"
                  ? "border-success/40 bg-success/5"
                  : g.tone === "down"
                    ? "border-danger/40 bg-danger/5"
                    : "border-border bg-muted/40"
              }`}
            >
              <span className={`text-6xl font-black ${gradeColor}`}>{g.grade}</span>
            </div>
            <div>
              <p className="text-lg font-semibold">{g.blurb}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatGrowth(growthRate)} week-over-week · momentum score {momentumScore}
              </p>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href="/login">
                  Get your verified grade <ArrowRight className="size-4" />
                </Link>
              </Button>
              <a
                href={xIntent}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Share2 className="size-4" /> Share your grade
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Enter your clicks above to get your organic growth grade.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
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
    </label>
  );
}
