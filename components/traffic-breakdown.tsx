"use client";

import { useState } from "react";
import { FileText, Link2, Monitor, Smartphone, Tablet } from "lucide-react";
import { SiteFavicon } from "@/components/site-favicon";
import type { BreakdownItem, TrafficBreakdown as TrafficBreakdownData } from "@/lib/data";
import { formatCompact, cn } from "@/lib/utils";
import { dashVar, dashTint, type DashColor } from "@/lib/dash-colors";

/**
 * "Where your traffic comes from" — first-party, aggregate, no per-visitor data.
 * One card tabs between Referrer / Country / Device; a second lists landing
 * pages. Each row carries an inline share bar; referrers get a real favicon
 * (the "Direct ·" splits and other non-hosts fall back to a link glyph). Client
 * component for the tabs, fed pre-read serializable counts.
 */
type Dim = "referrer" | "country" | "device";

export function TrafficBreakdown({ data }: { data: TrafficBreakdownData }) {
  const [dim, setDim] = useState<Dim>("referrer");

  const empty =
    data.sources.length === 0 &&
    data.pages.length === 0 &&
    data.countries.length === 0 &&
    data.devices.length === 0;

  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Traffic sources are being collected first-party (cookieless, no PII).
          Top sources, landing pages, countries, and devices will appear here as
          visits arrive.
        </p>
      </div>
    );
  }

  const active =
    dim === "referrer" ? data.sources : dim === "country" ? data.countries : data.devices;
  const color: DashColor = dim === "referrer" ? "blue" : dim === "country" ? "amber" : "pink";

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex gap-1" role="tablist" aria-label="Traffic dimension">
            <Tab label="Referrer" active={dim === "referrer"} onClick={() => setDim("referrer")} />
            <Tab label="Country" active={dim === "country"} onClick={() => setDim("country")} />
            <Tab label="Device" active={dim === "device"} onClick={() => setDim("device")} />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Visitors</span>
        </div>
        <RowList items={active} color={color} dim={dim} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span
              className="flex size-7 items-center justify-center rounded-md"
              style={{ color: dashVar.violet, backgroundColor: dashTint("violet", 14) }}
            >
              <FileText className="size-4" />
            </span>
            Landing pages
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">Visitors</span>
        </div>
        <RowList items={data.pages} color="violet" dim="page" />
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function RowList({
  items,
  color,
  dim,
}: {
  items: BreakdownItem[];
  color: DashColor;
  dim: Dim | "page";
}) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>;
  }
  const total = items.reduce((s, i) => s + i.hits, 0);
  const max = Math.max(1, ...items.map((i) => i.hits));

  return (
    <ul className="space-y-0.5">
      {items.map((it) => {
        const share = total > 0 ? Math.round((it.hits / total) * 100) : 0;
        return (
          <li
            key={it.label}
            className="relative flex items-center gap-2.5 overflow-hidden rounded-md px-2 py-1.5 text-sm"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-md"
              style={{ width: `${Math.max(4, (it.hits / max) * 100)}%`, backgroundColor: dashTint(color, 12) }}
              aria-hidden
            />
            <span className="relative z-10 flex size-[18px] shrink-0 items-center justify-center">
              <Leading label={it.label} dim={dim} color={color} />
            </span>
            <span className={cn("relative z-10 min-w-0 flex-1 truncate", dim === "page" && "font-mono text-[13px]")}>
              {it.label}
            </span>
            <span className="relative z-10 shrink-0 text-xs tabular-nums text-muted-foreground/70">{share}%</span>
            <span className="relative z-10 w-10 shrink-0 text-right font-medium tabular-nums">
              {formatCompact(it.hits)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const HOST_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

function Leading({ label, dim, color }: { label: string; dim: Dim | "page"; color: DashColor }) {
  if (dim === "country") return <span className="text-[15px] leading-none">{countryFlag(label)}</span>;
  if (dim === "device") {
    const Icon = /mobile/i.test(label) ? Smartphone : /tablet/i.test(label) ? Tablet : Monitor;
    return <Icon className="size-4" style={{ color: dashVar[color] }} />;
  }
  if (dim === "page") return <span className="size-2 rounded-[3px]" style={{ backgroundColor: dashVar[color] }} aria-hidden />;
  // referrer: a real favicon when the label leads with a host, else a link glyph.
  const host = label.split(" · ")[0].trim();
  if (HOST_RE.test(host)) return <SiteFavicon url={`https://${host}`} name={host} size={18} />;
  return <Link2 className="size-4 text-muted-foreground" />;
}

/** ISO-3166 alpha-2 country code → flag emoji. Falls back to a globe. */
function countryFlag(code: string): string {
  const c = code.trim().toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (c.charCodeAt(0) - 65), A + (c.charCodeAt(1) - 65));
}
