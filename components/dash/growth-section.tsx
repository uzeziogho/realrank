import { ListPlus, ShieldCheck, UserPlus, TrendingUp } from "lucide-react";
import { StatTile } from "@/components/dash/stat-tile";
import { formatCompact } from "@/lib/utils";
import type { Growth, GrowthKey } from "@/lib/growth";
import type { DashColor } from "@/lib/dash-colors";

/**
 * Owner-only signup growth: this week vs last week for directory listings,
 * verified sites and accounts, a 12-week trend on each tile, a week-by-week
 * table and two conversion rates. Counted from database rows, not events.
 */

const TILE: Record<GrowthKey, { color: DashColor; icon: React.ReactNode }> = {
  listings: { color: "green", icon: <ListPlus className="size-4" /> },
  sites: { color: "blue", icon: <ShieldCheck className="size-4" /> },
  accounts: { color: "violet", icon: <UserPlus className="size-4" /> },
};

function delta(cur: number, prev: number): { label: string; direction: "up" | "down" | "flat" } | undefined {
  if (prev <= 0) return cur > 0 ? { label: "new", direction: "up" } : undefined;
  const r = (cur - prev) / prev;
  return { label: `${r > 0 ? "+" : ""}${Math.round(r * 100)}%`, direction: r > 0.005 ? "up" : r < -0.005 ? "down" : "flat" };
}

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");
const weekLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function GrowthSection({ growth }: { growth: Growth }) {
  if (!growth.available) {
    return (
      <section id="growth" className="scroll-mt-24 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        Signup numbers are unavailable right now (the database couldn&apos;t be read).
      </section>
    );
  }
  const by = (k: GrowthKey) => growth.series.find((s) => s.key === k)!;
  const listings = by("listings");
  const accounts = by("accounts");
  // Newest week first in the table; the last 8 weeks are plenty to read a trend.
  const rows = growth.weekStarts.map((w, i) => ({ w, i })).reverse().slice(0, 8);

  return (
    <section id="growth" className="scroll-mt-24">
      <div className="mb-1 flex items-center gap-2">
        <TrendingUp className="size-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Signups</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        New in the last 7 days vs the 7 before, with a 12-week trend. Counted from the database, so ad blockers
        don&apos;t skew it.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {growth.series.map((s) => (
          <StatTile
            key={s.key}
            color={TILE[s.key].color}
            icon={TILE[s.key].icon}
            label={`${s.label} · this week`}
            value={formatCompact(s.last7)}
            sub={`${formatCompact(s.last30)} in 30 days · ${formatCompact(s.live ?? s.total)} ${s.live !== null ? "live" : "total"}`}
            delta={delta(s.last7, s.prev7)}
            spark={s.weekly}
          />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_16rem]">
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Week starting</th>
                {growth.series.map((s) => (
                  <th key={s.key} className="px-4 py-2 text-right font-medium">
                    {s.key === "listings" ? "Listings" : s.key === "sites" ? "Verified sites" : "Accounts"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ w, i }, idx) => (
                <tr key={w}>
                  <td className="px-4 py-2">
                    {weekLabel(w)}
                    {idx === 0 && <span className="ml-1.5 text-xs text-muted-foreground">(last 7 days)</span>}
                  </td>
                  {growth.series.map((s) => (
                    <td key={s.key} className="px-4 py-2 text-right tabular-nums">
                      {s.weekly[i]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">Conversion</p>
          <div>
            <p className="text-2xl font-bold tabular-nums">{pct(growth.verifiedListings, listings.live ?? 0)}</p>
            <p className="text-xs text-muted-foreground">
              of live listings verified ownership ({formatCompact(growth.verifiedListings)} of{" "}
              {formatCompact(listings.live ?? 0)})
            </p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{pct(growth.accountsWithSite, accounts.total)}</p>
            <p className="text-xs text-muted-foreground">
              of accounts published a site to the board ({formatCompact(growth.accountsWithSite)} of{" "}
              {formatCompact(accounts.total)})
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
