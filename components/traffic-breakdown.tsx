import { ExternalLink, FileText, Globe, MonitorSmartphone } from "lucide-react";
import type { BreakdownItem, TrafficBreakdown } from "@/lib/data";
import { formatCompact } from "@/lib/utils";
import { dashVar, dashTint, type DashColor } from "@/lib/dash-colors";

/**
 * "Where your traffic comes from" — breakdown lists for RealRank's own
 * first-party traffic. Aggregate counts only; no per-visitor data. Each card
 * carries one categorical color (icon chip, row dot, and share bar) so the four
 * cuts read as distinct at a glance. Renders a "collecting" note until the
 * beacon has recorded visits.
 */
export function TrafficBreakdown({ data }: { data: TrafficBreakdown }) {
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

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card color="blue" icon={<ExternalLink className="size-4" />} title="Top sources" items={data.sources} />
      <Card color="violet" icon={<FileText className="size-4" />} title="Landing pages" items={data.pages} />
      <Card
        color="amber"
        icon={<Globe className="size-4" />}
        title="Countries"
        items={data.countries}
        labelFn={(l) => (
          <>
            <span className="mr-1.5">{countryFlag(l)}</span>
            {l}
          </>
        )}
      />
      <Card color="pink" icon={<MonitorSmartphone className="size-4" />} title="Devices" items={data.devices} />
    </div>
  );
}

function Card({
  color,
  icon,
  title,
  items,
  labelFn,
}: {
  color: DashColor;
  icon: React.ReactNode;
  title: string;
  items: BreakdownItem[];
  labelFn?: (label: string) => React.ReactNode;
}) {
  const total = items.reduce((s, i) => s + i.hits, 0);
  const max = Math.max(1, ...items.map((i) => i.hits));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <span
          className="flex size-7 items-center justify-center rounded-md"
          style={{ color: dashVar[color], backgroundColor: dashTint(color, 14) }}
        >
          {icon}
        </span>
        {title}
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => {
            const share = total > 0 ? Math.round((it.hits / total) * 100) : 0;
            return (
              <li
                key={it.label}
                className="relative flex items-center gap-2 overflow-hidden rounded-md px-2.5 py-1.5 text-sm"
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-md"
                  style={{ width: `${Math.max(4, (it.hits / max) * 100)}%`, backgroundColor: dashTint(color, 12) }}
                  aria-hidden
                />
                <span
                  className="relative z-10 size-2 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: dashVar[color] }}
                  aria-hidden
                />
                <span className="relative z-10 min-w-0 flex-1 truncate">
                  {labelFn ? labelFn(it.label) : it.label}
                </span>
                <span className="relative z-10 shrink-0 text-xs tabular-nums text-muted-foreground/70">{share}%</span>
                <span className="relative z-10 w-10 shrink-0 text-right tabular-nums font-medium">
                  {formatCompact(it.hits)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** ISO-3166 alpha-2 country code → flag emoji. Falls back to a globe. */
function countryFlag(code: string): string {
  const c = code.trim().toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (c.charCodeAt(0) - 65), A + (c.charCodeAt(1) - 65));
}
