import { Globe, Eye, EyeOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { setSiteActive, deleteSite } from "@/app/dashboard/actions";
import { categoryLabel } from "@/lib/config";
import { formatCompact, formatGrowth, hostname } from "@/lib/utils";
import type { PublishedSite } from "@/lib/supabase/types";

export function SiteManager({ sites }: { sites: PublishedSite[] }) {
  if (sites.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        No sites yet. Add your first one above to appear on the leaderboard.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <ul className="divide-y divide-border">
        {sites.map((site) => (
          <li key={site.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Globe className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{site.display_name}</p>
                  {site.category && (
                    <Badge variant="outline">{categoryLabel(site.category)}</Badge>
                  )}
                  {site.is_active ? (
                    <Badge variant="success">Live</Badge>
                  ) : (
                    <Badge variant="outline">Hidden</Badge>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {hostname(site.site_url)} · {formatCompact(site.clicks_28d)} clicks / 28d ·{" "}
                  <span className="text-success">{formatGrowth(site.growth_rate)}</span> momentum
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <form action={setSiteActive}>
                <input type="hidden" name="id" value={site.id} />
                <input type="hidden" name="active" value={site.is_active ? "false" : "true"} />
                <SubmitButton
                  className="border border-border hover:bg-accent"
                  pendingText="Saving…"
                >
                  {site.is_active ? (
                    <><EyeOff className="size-3.5" /> Unpublish</>
                  ) : (
                    <><Eye className="size-3.5" /> Publish</>
                  )}
                </SubmitButton>
              </form>

              <form action={deleteSite}>
                <input type="hidden" name="id" value={site.id} />
                <SubmitButton
                  className="text-danger hover:bg-danger/10"
                  pendingText="Deleting…"
                  confirm={`Delete ${site.display_name}? This can't be undone.`}
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Delete</span>
                </SubmitButton>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
