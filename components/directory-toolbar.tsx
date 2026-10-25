"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Search + sort controls for the directory. Writes to the URL (?q, ?sort) and
 * preserves whatever else is there (?category), so the server page stays the
 * source of truth and views remain linkable. Client component — it navigates.
 */
const SORTS = [
  { key: "new", label: "Newest" },
  { key: "visited", label: "Most visited" },
  { key: "az", label: "A–Z" },
] as const;

export function DirectoryToolbar({ sort, q }: { sort: string; q: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  function navigate(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ q: term.trim() || null });
        }}
        className="relative w-full sm:max-w-xs"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search projects…"
          aria-label="Search projects"
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary/50"
        />
      </form>

      <div className="flex gap-1" role="group" aria-label="Sort projects">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => navigate({ sort: s.key === "new" ? null : s.key })}
            aria-pressed={sort === s.key}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              sort === s.key
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
