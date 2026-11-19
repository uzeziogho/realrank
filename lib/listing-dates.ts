/**
 * Dates on directory listings: the "New" badge, the "Added" filter and the
 * date headers on the Newest view. Rolling windows (last 7 / 30 days) rather
 * than calendar weeks, so "This week" never empties out on a Monday.
 */

const DAY_MS = 86_400_000;

/** A listing counts as "New" for this many days. */
export const NEW_DAYS = 7;

export const ADDED_FILTERS = [
  { key: "week", label: "Last 7 days", days: 7 },
  { key: "month", label: "Last 30 days", days: 30 },
] as const;

export type AddedKey = (typeof ADDED_FILTERS)[number]["key"];

export function parseAdded(raw: string | undefined): AddedKey | null {
  return ADDED_FILTERS.some((f) => f.key === raw) ? (raw as AddedKey) : null;
}

function ageDays(createdAt: string, now: number): number {
  return (now - new Date(createdAt).getTime()) / DAY_MS;
}

export function isNewListing(createdAt: string, now = Date.now()): boolean {
  return ageDays(createdAt, now) < NEW_DAYS;
}

export function addedWithin(createdAt: string, key: AddedKey, now = Date.now()): boolean {
  const days = ADDED_FILTERS.find((f) => f.key === key)!.days;
  return ageDays(createdAt, now) < days;
}

/** How many listings each "Added" option would show. */
export function addedCounts(items: { createdAt: string }[], now = Date.now()): Record<AddedKey, number> {
  const out = { week: 0, month: 0 } as Record<AddedKey, number>;
  for (const i of items) for (const f of ADDED_FILTERS) if (ageDays(i.createdAt, now) < f.days) out[f.key]++;
  return out;
}

/**
 * The header a listing sits under on the Newest view: "This week", "Last week",
 * then "Earlier in November" for the rest of the current month, then one group
 * per month ("October", or "December 2025" for an earlier year).
 */
export function dateGroupLabel(createdAt: string, now = Date.now()): string {
  const age = ageDays(createdAt, now);
  if (age < 7) return "This week";
  if (age < 14) return "Last week";
  const d = new Date(createdAt);
  const n = new Date(now);
  const month = d.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  if (d.getUTCFullYear() === n.getUTCFullYear() && d.getUTCMonth() === n.getUTCMonth()) return `Earlier in ${month}`;
  return d.getUTCFullYear() === n.getUTCFullYear() ? month : `${month} ${d.getUTCFullYear()}`;
}

/** Split an already newest-first list into consecutive date groups. */
export function groupByDate<T extends { createdAt: string }>(items: T[], now = Date.now()): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = dateGroupLabel(item.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
