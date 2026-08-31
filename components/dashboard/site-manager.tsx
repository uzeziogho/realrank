import { Globe, Eye, EyeOff, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/dashboard/submit-button";
import { setSiteActive, deleteSite, updateSiteDetails } from "@/app/dashboard/actions";
import { categories, categoryLabel } from "@/lib/config";
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
          <li key={site.id} className="px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                  {site.description ? (
                    <p className="mt-1 truncate text-sm text-muted-foreground/80">{site.description}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground/60">No description yet — add one so it shows on the leaderboard.</p>
                  )}
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
            </div>

            {/* Edit public details (name / description / category) */}
            <details className="mt-2 group">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Pencil className="size-3" /> Edit details
              </summary>
              <form action={updateSiteDetails} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr] sm:items-end">
                <input type="hidden" name="id" value={site.id} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Display name</label>
                  <input name="display_name" required maxLength={80} defaultValue={site.display_name}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium">Category</label>
                  <select name="category" defaultValue={site.category ?? ""}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2">
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.slug} value={c.slug}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-medium">Description</label>
                  <input name="description" maxLength={200} defaultValue={site.description ?? ""}
                    placeholder="One line about your business — shows on the leaderboard"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2" />
                </div>
                <div className="sm:col-span-2">
                  <SubmitButton className="bg-primary text-primary-foreground hover:opacity-90" pendingText="Saving…">
                    Save details
                  </SubmitButton>
                </div>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
