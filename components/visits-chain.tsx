import { ShieldCheck, ChevronRight, ChevronDown, MousePointerClick } from "lucide-react";
import { SiteFavicon } from "@/components/site-favicon";
import { siteConfig } from "@/lib/config";
import { formatCompact } from "@/lib/utils";

/**
 * The one thing a free listing can prove: the traffic RealRank actually sent
 * it. Reads as an attribution chain — the directory, then this listing, then
 * the visits delivered to the site — so the number lands as an outcome, not a
 * vanity metric. Shown only at or above VISITS_FLOOR (the caller gates it).
 * Server component; SiteFavicon is the only (client) leaf.
 */
export function VisitsChain({
  siteUrl,
  host,
  visits,
}: {
  siteUrl: string;
  host: string;
  visits: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2.5">
        <Node>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-4" />
          </span>
          <Text title={`Listed on ${siteConfig.name}`} sub="the open directory" />
        </Node>

        <Connector />

        <Node>
          <SiteFavicon url={siteUrl} name={host} size={32} className="rounded-lg" />
          <Text title={host} sub="your listing" />
        </Node>

        <Connector />

        <Node highlight>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
            <MousePointerClick className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tabular-nums text-success">
              {formatCompact(visits)} visits
            </div>
            <div className="truncate text-xs text-muted-foreground">sent to your site</div>
          </div>
        </Node>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        All-time click-throughs {siteConfig.name} sent to {host} from this listing.
      </p>
    </div>
  );
}

function Node({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
        highlight ? "border-success/30 bg-success/[0.06]" : "border-border bg-background/40"
      }`}
    >
      {children}
    </div>
  );
}

function Text({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-semibold">{title}</div>
      <div className="truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex shrink-0 items-center justify-center text-muted-foreground/50 sm:flex-col">
      <ChevronDown className="size-4 sm:hidden" />
      <ChevronRight className="hidden size-4 sm:block" />
    </div>
  );
}
