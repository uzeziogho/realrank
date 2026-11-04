"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, BadgeCheck, Plus } from "lucide-react";
import { categoryLabel, PRICING_LABELS } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * The interactive browser for the alternatives directory. Groups are rendered
 * as "Instead of <tool>" cards with their alternatives inline; a client-side
 * search + category filter narrows them instantly. The cards and their links
 * are real anchors (to each tool's page and each listing), so the page is still
 * crawlable with JS off — the filter only hides, it doesn't fetch.
 */

export interface BrowserAlt {
  host: string;
  displayName: string;
  tagline: string | null;
  category: string | null;
  pricing: string | null;
  ownerVerified: boolean;
}

export interface BrowserGroup {
  slug: string;
  name: string;
  alts: BrowserAlt[];
}

/** How many alternatives to show inline before linking to the full tool page. */
const MAX_INLINE = 5;

export function AlternativesBrowser({ groups }: { groups: BrowserGroup[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  // Categories actually present across the groups' listings (real taxonomy).
  const cats = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) for (const a of g.alts) if (a.category) set.add(a.category);
    return [...set].sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)));
  }, [groups]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return groups.filter((g) => {
      if (cat && !g.alts.some((a) => a.category === cat)) return false;
      if (!ql) return true;
      const hay = `${g.name} ${g.alts.map((a) => `${a.displayName} ${a.tagline ?? ""}`).join(" ")}`.toLowerCase();
      return hay.includes(ql);
    });
  }, [groups, q, cat]);

  const totalAlts = useMemo(() => groups.reduce((n, g) => n + g.alts.length, 0), [groups]);

  return (
    <>
      {/* Search + counts */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Replace… Canva, Notion, Klaviyo"
            aria-label="Search tools and alternatives"
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-3 text-sm outline-none transition-colors focus:border-primary/50"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {groups.length} tools · {totalAlts} alternatives
        </span>
      </div>

      {/* Category chips */}
      {cats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Chip label="All" active={cat === null} onClick={() => setCat(null)} />
          {cats.map((c) => (
            <Chip key={c} label={categoryLabel(c)} active={cat === c} onClick={() => setCat(c)} />
          ))}
        </div>
      )}

      {/* Grid of "instead of <tool>" cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-semibold">No alternatives match “{q}” yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Building one? Be the first listed — this directory ranks for “[tool] alternatives” searches.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" /> List your alternative
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
          {filtered.map((g) => (
            <GroupCard key={g.slug} group={g} />
          ))}
        </div>
      )}
    </>
  );
}

function GroupCard({ group }: { group: BrowserGroup }) {
  const shown = group.alts.slice(0, MAX_INLINE);
  const extra = group.alts.length - shown.length;
  const countLabel = group.alts.length === 1 ? "1 alternative" : `${group.alts.length} alternatives`;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-border/80">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Instead of</span>
          <span className="truncate text-lg font-bold tracking-tight">{group.name}</span>
        </div>
        <Link
          href={`/alternatives-to/${group.slug}`}
          className="shrink-0 whitespace-nowrap text-sm font-medium text-muted-foreground hover:text-primary"
        >
          {countLabel} →
        </Link>
      </div>

      {shown.map((a) => (
        <Link
          key={a.host}
          href={`/listed/${a.host}`}
          className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/50 px-4 py-3.5 transition-colors hover:bg-accent/50"
        >
          <span
            className="flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: colorFor(a.host) }}
          >
            {a.displayName.charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="truncate">{a.displayName}</span>
              {a.ownerVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified" />}
            </span>
            {a.tagline && <span className="line-clamp-1 text-[13px] text-muted-foreground">{a.tagline}</span>}
          </span>
          {a.pricing && PRICING_LABELS[a.pricing] && (
            <span className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
              {PRICING_LABELS[a.pricing]}
            </span>
          )}
        </Link>
      ))}

      {extra > 0 && (
        <Link
          href={`/alternatives-to/${group.slug}`}
          className="border-b border-border/50 px-4 py-2.5 text-sm text-muted-foreground hover:text-primary"
        >
          +{extra} more →
        </Link>
      )}

      <Link href="/submit" className="mt-auto px-4 py-3 text-[13px] text-primary hover:underline">
        + Built a {group.name} alternative? List it free
      </Link>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary/40 bg-primary/10 font-medium text-primary"
          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/** Deterministic avatar color from the host, so a listing's square is stable. */
function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 42%)`;
}
