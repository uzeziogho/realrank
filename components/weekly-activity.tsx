import { timeAgo, formatCompact } from "@/lib/utils";

/**
 * A one-line pulse for the leaderboard and directory: how many sites joined in
 * the last 7 days and (directory) how many visits listings were sent. Each part
 * shows only above a floor — a small number reads as "nobody's here" — and
 * below it we fall back to the latest arrival, or nothing at all.
 */

/** Joins in 7 days needed before the count is shown. */
export const JOINED_FLOOR = 3;
/** Site-wide visits in 7 days needed before the total is shown. */
export const WEEKLY_VISITS_FLOOR = 50;
/** The "latest: X joined …" fallback only while it's still recent. */
const LATEST_MAX_DAYS = 14;

const DAY_MS = 86_400_000;

export function joinedThisWeek<T extends { createdAt: string }>(items: T[], now = Date.now()) {
  const sorted = [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return {
    count: sorted.filter((i) => now - new Date(i.createdAt).getTime() <= 7 * DAY_MS).length,
    latest: sorted[0] ?? null,
  };
}

export function WeeklyActivity({
  joined,
  latestName,
  latestAt,
  noun,
  visits,
  className,
}: {
  joined: number;
  latestName: string | null;
  latestAt: string | null;
  /** "the board" / "the directory" */
  noun: string;
  visits?: number;
  className?: string;
}) {
  const parts: string[] = [];
  if (joined >= JOINED_FLOOR) {
    parts.push(`${joined} sites joined ${noun} this week`);
  } else if (latestName && latestAt && Date.now() - new Date(latestAt).getTime() <= LATEST_MAX_DAYS * DAY_MS) {
    parts.push(`Latest: ${latestName} joined ${timeAgo(latestAt)}`);
  }
  if (visits !== undefined && visits >= WEEKLY_VISITS_FLOOR) {
    parts.push(`${formatCompact(visits)} visits sent to listed sites in 7 days`);
  }
  if (parts.length === 0) return null;

  return (
    <p className={className ?? "inline-flex items-center gap-2 text-sm text-muted-foreground"}>
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      {parts.join(" · ")}
    </p>
  );
}
