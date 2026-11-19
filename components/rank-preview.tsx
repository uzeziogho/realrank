"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Upload, Lock, Loader2, AlertCircle, TrendingUp, TrendingDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectCTA } from "@/components/connect-cta";
import { dailyClicksFromFile, summarize, placeOnBoard, type BoardEntry, type ExportSummary } from "@/lib/gsc-export";
import { track } from "@/lib/track";
import { cn, formatCompact, formatGrowth } from "@/lib/utils";

type State =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "error"; message: string }
  | { kind: "result"; summary: ExportSummary; file: string };

/**
 * Drop a Search Console export, see where you'd rank on today's board. Parsed
 * entirely in the browser — the file is never uploaded — and the result is a
 * private preview: only a live Search Console connection puts a site on the
 * public board, because an export can be edited.
 */
export function RankPreview({ board }: { board: BoardEntry[] }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return setState({ kind: "error", message: "That file is too big for a Search Console export." });
    setState({ kind: "reading" });
    try {
      const rows = await dailyClicksFromFile(file);
      if (rows.length === 0) {
        return setState({
          kind: "error",
          message:
            "Couldn't find daily clicks in that file. Use Search Console → Performance → Export → Download CSV, and drop the zip (or the Chart.csv inside it).",
        });
      }
      const summary = summarize(rows)!;
      if (summary.daysCovered < 28) {
        return setState({
          kind: "error",
          message: `That export covers ${summary.daysCovered} days. Set the date range to "Last 3 months" (or at least 28 days) before exporting — momentum compares your last 7 days with the 21 before.`,
        });
      }
      track("rank_preview", summary.clicks28d > 0 ? "ranked" : "no_clicks");
      setState({ kind: "result", summary, file: file.name });
    } catch {
      setState({
        kind: "error",
        message: "Couldn't read that file. If it's a zip, try unzipping it and dropping the Chart.csv inside.",
      });
    }
  }

  if (state.kind === "result") return <Result summary={state.summary} board={board} onReset={() => setState({ kind: "idle" })} />;

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handle(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-10",
          dragging ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50",
        )}
      >
        {state.kind === "reading" ? (
          <Loader2 className="size-8 animate-spin text-primary" />
        ) : (
          <Upload className="size-8 text-primary" />
        )}
        <span className="font-semibold">{state.kind === "reading" ? "Reading your export…" : "Drop your Search Console export"}</span>
        <span className="text-sm text-muted-foreground">The .zip from Search Console, or the Chart.csv inside it</span>
        <span className="mt-1 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
          Choose file
        </span>
        <input
          ref={input}
          type="file"
          accept=".zip,.csv,application/zip,text/csv"
          className="sr-only"
          onChange={(e) => void handle(e.target.files?.[0])}
        />
      </label>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="size-3.5" /> Read on your device — the file is never uploaded or saved.
      </p>
      {state.kind === "error" && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.message}
        </p>
      )}
    </div>
  );
}

function Result({ summary, board, onReset }: { summary: ExportSummary; board: BoardEntry[]; onReset: () => void }) {
  const noClicks = summary.clicks28d === 0;
  const place = placeOnBoard(summary, board);
  const up = summary.growthRate > 0.005;
  const down = summary.growthRate < -0.005;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-6" aria-live="polite">
        <p className="text-sm font-medium text-primary">Your preview · private</p>
        {noClicks ? (
          <>
            <p className="mt-2 text-2xl font-bold">No organic clicks in the last 28 days yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              That&apos;s normal for a new site. Connect Search Console now and you&apos;ll appear on the board
              automatically the day your first clicks land.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold tabular-nums tracking-tight">#{place.rank}</span>
              <span className="text-muted-foreground">of {place.total} — where you&apos;d rank on today&apos;s board</span>
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm">
              <span className={cn("inline-flex items-center gap-1 font-semibold", up ? "text-success" : down ? "text-danger" : "text-muted-foreground")}>
                {up ? <TrendingUp className="size-4" /> : down ? <TrendingDown className="size-4" /> : null}
                {formatGrowth(summary.growthRate)}
              </span>
              <span className="text-muted-foreground">
                momentum · {formatCompact(summary.clicks7d)} clicks in 7 days · {formatCompact(summary.clicks28d)} in 28 · #{place.volumeRank} by volume
              </span>
            </p>
            {(place.above || place.below) && (
              <p className="mt-3 text-sm text-muted-foreground">
                {place.above && (
                  <>
                    Just behind <Link href={`/site/${place.above.slug}`} className="font-medium text-foreground hover:underline">{place.above.name}</Link>
                  </>
                )}
                {place.above && place.below && " · "}
                {place.below && (
                  <>
                    just ahead of <Link href={`/site/${place.below.slug}`} className="font-medium text-foreground hover:underline">{place.below.name}</Link>
                  </>
                )}
              </p>
            )}
          </>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Data through {summary.lastDate}. Nothing was saved or published.</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="font-semibold">{noClicks ? "Get on the board when clicks arrive" : "Make it official"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          An export can be edited, so it can&apos;t be verified — only a live, read-only Search Console connection puts
          your site on the public board. It takes about 30 seconds, and your rank updates by itself every day.
        </p>
        <ConnectCTA label="Publish my verified rank" source="rank_preview" align="start" className="mt-4" />
        <p className="mt-3 text-sm text-muted-foreground">
          Not ready to connect?{" "}
          <Link href="/submit" onClick={() => track("list_click", "rank_preview")} className="font-medium text-primary hover:underline">
            List your site free in the directory
          </Link>{" "}
          — upgrade to a ranked spot whenever you like.
        </p>
      </section>

      <button onClick={onReset} className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground">
        <RotateCcw className="size-3.5" /> Try another export
      </button>
    </div>
  );
}
