import { ExternalLink, FileText, Globe, MonitorSmartphone } from "lucide-react";
import type { BreakdownItem, TrafficBreakdown } from "@/lib/data";
import { formatCompact } from "@/lib/utils";

/**
 * "Where your traffic comes from" — datafast-style breakdown lists for
 * RealRank's own first-party traffic. Aggregate counts only; no per-visitor
 * data. Renders a "collecting" note until the beacon has recorded visits.
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
      <Card icon={<ExternalLink className="size-4" />} title="Top sources" items={data.sources} />
      <Card icon={<FileText className="size-4" />} title="Landing pages" items={data.pages} />
      <Card
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
      <Card icon={<MonitorSmartphone className="size-4" />} title="Devices" items={data.devices} />
    </div>
  );
}

function Card({
  icon,
  title,
  items,
  labelFn,
}: {
  icon: React.ReactNode;
  title: string;
  items: BreakdownItem[];
  labelFn?: (label: string) => React.ReactNode;
}) {
  const max = Math.max(1, ...items.map((i) => i.hits));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </div>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No data yet</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li
              key={it.label}
              className="relative flex items-center justify-between overflow-hidden rounded-md px-2.5 py-1.5 text-sm"
            >
              <span
                className="absolute inset-y-0 left-0 rounded-md bg-primary/10"
                style={{ width: `${Math.max(4, (it.hits / max) * 100)}%` }}
                aria-hidden
              />
              <span className="relative z-10 truncate">{labelFn ? labelFn(it.label) : it.label}</span>
              <span className="relative z-10 ml-3 shrink-0 tabular-nums text-muted-foreground">
                {formatCompact(it.hits)}
              </span>
            </li>
          ))}
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
