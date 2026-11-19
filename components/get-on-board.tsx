import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { SPOTLIGHT } from "@/lib/spotlight";
import { SPONSOR } from "@/lib/sponsor";
import { Button } from "@/components/ui/button";
import { TrackedLink } from "@/components/tracked-link";
import { cn } from "@/lib/utils";

/**
 * The end-of-page "get on RealRank" band: the same two actions the homepage
 * hero offers (list free · get a verified rank), worded the same way, so every
 * page that someone finishes reading has a next step. Server component; the
 * clicks are recorded with the page as `source` so the funnel shows which
 * pages convert.
 */
export function GetOnBoard({
  source,
  title = "Is your site growing?",
  body = "List it free in a minute, or connect Search Console for a verified, ranked spot — also free.",
  primary = "list",
  paid = true,
  className,
}: {
  /** Show the "want visitors now?" line with Spotlight and Sponsor (default on). */
  paid?: boolean;
  /** Where the band sits, recorded on the click events (e.g. "leaderboard"). */
  source: string;
  /** Which action leads: "rank" on pages about verified ranks, "list" elsewhere. */
  primary?: "list" | "rank";
  title?: string;
  body?: string;
  className?: string;
}) {
  return (
    <section
      aria-label="Get on RealRank"
      className={cn(
        "rounded-2xl border border-primary/30 bg-primary/[0.05] p-6 text-center sm:p-8",
        className,
      )}
    >
      <h2 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-pretty text-sm text-muted-foreground sm:text-base">{body}</p>
      {/* Rendered in priority order (not CSS-reversed) so tab order matches what's seen. */}
      <div className="mt-5 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
        {(primary === "rank" ? (["rank", "list"] as const) : (["list", "rank"] as const)).map((action) =>
          action === "list" ? (
            <Button key="list" asChild size="lg" variant={primary === "list" ? "default" : "outline"}>
              <TrackedLink href="/submit" event="list_click" label={source}>
                <Plus className="size-4" /> List your project — free
              </TrackedLink>
            </Button>
          ) : (
            <Button key="rank" asChild size="lg" variant={primary === "rank" ? "default" : "outline"}>
              <TrackedLink href="/login" event="connect_click" label={source}>
                <ShieldCheck className="size-4" /> Get a verified rank
              </TrackedLink>
            </Button>
          ),
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Read-only Search Console access · no card ·{" "}
        <Link href="/pricing" className="underline-offset-2 hover:underline">
          what&apos;s free
        </Link>
      </p>
      {paid && (
        <p className="mt-4 border-t border-primary/15 pt-4 text-sm text-muted-foreground">
          Want visitors this week?{" "}
          <TrackedLink href="/spotlight" event="spotlight_click" label={source} className="font-medium text-primary hover:underline">
            Book a Spotlight
          </TrackedLink>{" "}
          ({SPOTLIGHT.price} for {SPOTLIGHT.days} days at the top of the directory) or{" "}
          <TrackedLink href="/sponsor" event="sponsor_click" label={source} className="font-medium text-primary hover:underline">
            sponsor the leaderboard
          </TrackedLink>{" "}
          ({SPONSOR.price}/{SPONSOR.cadence}). Always labelled, never changes rankings.
        </p>
      )}
    </section>
  );
}
