import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Compact number formatting: 41200 -> "41.2K", 1250000 -> "1.25M". */
export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

/** Full number formatting with thousands separators. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Growth ratio -> signed percentage string, e.g. 0.62 -> "+62%". */
export function formatGrowth(ratio: number): string {
  const pct = Math.round(ratio * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

/** Human "time ago" for the Last updated label. */
export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function hostname(url: string): string {
  // GSC domain properties look like "sc-domain:example.com".
  if (url.startsWith("sc-domain:")) return url.slice("sc-domain:".length);
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }
}

/** A clickable href for a stored site_url, including GSC "sc-domain:" ids. */
export function siteHref(url: string): string {
  if (url.startsWith("sc-domain:")) return `https://${url.slice("sc-domain:".length)}`;
  return url;
}
