"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";

/**
 * Search box for the leaderboard. Writes `?q=` (debounced) so the Server
 * Component re-filters and the result stays crawlable/shareable. Resets to
 * page 1 on a new query.
 */
export function LeaderboardSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const [, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    // Skip the initial mount so we don't immediately re-push the same URL.
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const q = value.trim();
      if (q) params.set("q", q);
      else params.delete("q");
      params.delete("page"); // new search → back to page 1
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}#leaderboard` : `${pathname}#leaderboard`, { scroll: false });
      });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search sites…"
        aria-label="Search the leaderboard"
        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm outline-none ring-ring focus-visible:ring-2"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
