"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavLink } from "@/lib/config";

export interface NavSection {
  /** Optional group heading inside the dropdown. */
  label?: string;
  links: NavLink[];
}

/**
 * A labelled header dropdown (Boards, Tools, Learn). Desktop only (hidden below
 * `sm`, where MobileNav lists the same links). Closes on outside click, Escape,
 * and route change. Descriptions render when present.
 */
export function NavMenu({ label, sections }: { label: string; sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on route change.
  useEffect(() => setOpen(false), [pathname]);

  // Close on outside click + Escape while open.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Highlight the trigger when the current route lives inside this menu.
  const active = sections.some((s) =>
    s.links.some((l) => pathname === l.href || pathname.startsWith(`${l.href}/`)),
  );

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 max-h-[80vh] w-80 overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-lg"
        >
          {sections.map((section, i) => (
            <div key={section.label ?? i}>
              {i > 0 && <div className="my-1 border-t border-border" />}
              {section.label && (
                <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </p>
              )}
              {section.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  role="menuitem"
                  className="block rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                >
                  <span className="block text-sm font-medium text-foreground">{l.label}</span>
                  {l.description && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {l.description}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
