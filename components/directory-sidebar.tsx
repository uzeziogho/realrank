"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The directory's filter rail: search, category list (with counts), sort, a
 * verified-only toggle, and the "list your project" nudge. On desktop it's a
 * sticky left rail; on mobile it collapses behind a "Filters" button that opens
 * a slide-over sheet. All controls write to the URL (?q, ?category, ?sort,
 * ?verified) so the server page stays the source of truth and every view is
 * linkable; category items are real links (preserving the other params) for
 * crawlers and middle-click, while the controls navigate.
 */

const SORTS = [
  { key: "new", label: "Newest" },
  { key: "visited", label: "Most visited" },
  { key: "az", label: "A–Z" },
] as const;

export interface SidebarCategory {
  slug: string;
  label: string;
  count: number;
}

export interface SidebarProps {
  categories: SidebarCategory[];
  total: number;
  active: string | null;
  sort: string;
  q: string;
  verified: boolean;
}

export function DirectorySidebar(props: SidebarProps) {
  const { active, sort, q, verified } = props;
  const [open, setOpen] = useState(false);

  // Count of filters that differ from the default, for the mobile trigger badge.
  const activeCount =
    (active ? 1 : 0) + (verified ? 1 : 0) + (q.trim() ? 1 : 0) + (sort !== "new" ? 1 : 0);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Mobile trigger — only below lg (the desktop rail is the first grid cell). */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium transition-colors hover:border-primary/40"
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col overflow-y-auto border-l border-border bg-background shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-5 py-3.5">
              <span className="text-sm font-semibold">Filters</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="p-5">
              <FilterControls {...props} onAfterSelect={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop rail */}
      <aside className="hidden lg:sticky lg:top-24 lg:flex lg:flex-col lg:gap-7 lg:self-start lg:pr-2">
        <FilterControls {...props} />
      </aside>
    </>
  );
}

function FilterControls({
  categories,
  total,
  active,
  sort,
  q,
  verified,
  onAfterSelect,
}: SidebarProps & { onAfterSelect?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  function hrefFor(patch: Record<string, string | null>): string {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v) sp.delete(k);
      else sp.set(k, v);
    }
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function navigate(patch: Record<string, string | null>) {
    router.push(hrefFor(patch), { scroll: false });
    onAfterSelect?.();
  }

  return (
    <div className="flex flex-col gap-7">
      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ q: term.trim() || null });
        }}
        className="relative"
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

      {/* Category */}
      <div className="flex flex-col gap-0.5">
        <p className="px-2.5 pb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
          Category
        </p>
        <CategoryItem
          href={hrefFor({ category: null })}
          label="All"
          count={total}
          active={active === null}
          onSelect={onAfterSelect}
        />
        {categories.map((c) => (
          <CategoryItem
            key={c.slug}
            href={hrefFor({ category: c.slug })}
            label={c.label}
            count={c.count}
            active={active === c.slug}
            onSelect={onAfterSelect}
          />
        ))}
      </div>

      {/* Sort */}
      <div className="flex flex-col gap-0.5">
        <p className="px-2.5 pb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
          Sort
        </p>
        {SORTS.map((s) => {
          const on = sort === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => navigate({ sort: s.key === "new" ? null : s.key })}
              aria-pressed={on}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-foreground/90 transition-colors hover:bg-accent"
            >
              <span
                className={cn(
                  "size-3 shrink-0 rounded-full border-[1.5px] transition-colors",
                  on ? "border-[5px] border-primary" : "border-muted-foreground/40",
                )}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Verified-only toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={verified}
        onClick={() => navigate({ verified: verified ? null : "1" })}
        className="flex items-center justify-between px-2.5 text-sm"
      >
        <span>Verified only</span>
        <span
          className={cn(
            "relative h-[18px] w-8 rounded-full transition-colors",
            verified ? "bg-primary" : "bg-muted-foreground/30",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-[14px] rounded-full bg-background shadow-sm transition-all",
              verified ? "left-[16px]" : "left-0.5",
            )}
          />
        </span>
      </button>

      {/* List-your-project nudge */}
      <div className="flex flex-col gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-4">
        <p className="text-sm font-semibold">Built something?</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Free to list. Add a badge to get verified and join the ranked board.
        </p>
        <Button asChild size="sm" className="mt-0.5 w-full">
          <Link href="/submit">
            <Plus className="size-4" /> List your project
          </Link>
        </Button>
      </div>
    </div>
  );
}

function CategoryItem({
  href,
  label,
  count,
  active,
  onSelect,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
  onSelect?: () => void;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-primary/10 font-semibold text-primary"
          : "text-foreground/90 hover:bg-accent",
      )}
    >
      <span>{label}</span>
      <span className={cn("text-[13px] tabular-nums", active ? "text-primary/70" : "text-muted-foreground/60")}>
        {count}
      </span>
    </Link>
  );
}
