import Link from "next/link";
import { TrendingUp, BarChart3, Clock, HelpCircle } from "lucide-react";

/**
 * Plain-English "how ranking works" explainer, shown next to the board so
 * visitors understand Momentum vs Volume (and the pending state) without
 * leaving for /about. Native <details> — no client JS, and accessible.
 */
export function RankingExplainer() {
  return (
    <details className="group rounded-xl border border-border bg-card/50 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <HelpCircle className="size-4 text-primary" />
        How does ranking work?
        <span className="ml-auto text-xs text-muted-foreground transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="space-y-4 border-t border-border px-4 py-4 text-muted-foreground">
        <p>
          Every number here is a real <strong className="text-foreground">Google
          Search Console</strong> organic-click count from the site owner&apos;s own
          account — nothing is estimated. We read two windows: clicks in the last
          <strong className="text-foreground"> 7 days</strong> and the last
          <strong className="text-foreground"> 28 days</strong>. You can rank the
          board two ways:
        </p>

        <div className="flex items-start gap-3">
          <TrendingUp className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <strong className="text-foreground">Momentum</strong> (default) ranks by
            growth velocity: your average daily clicks over the last 7 days versus the
            prior 21, weighted by size. A fast-growing small site can out-rank a big
            but flat one — and a shrinking site drops below its steady peers.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <BarChart3 className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <strong className="text-foreground">Volume</strong> ranks purely by total
            organic clicks over the last 28 days — the &ldquo;who&apos;s biggest right
            now&rdquo; view.
          </p>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p>
            <strong className="text-foreground">Pending</strong> sites appear at the
            bottom without a rank. They&apos;ve connected but have no verified clicks in
            the current window yet (Search Console data also lags a couple of days), so
            there&apos;s no growth or volume story to rank them by — yet.
          </p>
        </div>

        <p>
          Want the exact formula?{" "}
          <Link href="/about" className="text-primary hover:underline">
            See how it works →
          </Link>
        </p>
      </div>
    </details>
  );
}
