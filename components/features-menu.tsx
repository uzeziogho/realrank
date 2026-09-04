"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toolLinks, guideLinks } from "@/lib/config";

/**
 * Header "Tools" dropdown — surfaces every tool and guide page that isn't a
 * primary nav link, so nothing RealRank ships stays hard to find. Desktop only
 * (hidden below `sm`, where MobileNav lists the same links). Closes on outside
 * click, Escape, and route change.
 */
export function FeaturesMenu() {
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

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        Tools
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-lg"
        >
          <MenuSection label="Tools" links={toolLinks} />
          <div className="my-1 border-t border-border" />
          <MenuSection label="Guides" links={guideLinks} />
        </div>
      )}
    </div>
  );
}

function MenuSection({
  label,
  links,
}: {
  label: string;
  links: { href: string; label: string; description?: string }[];
}) {
  return (
    <div>
      <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {links.map((l) => (
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
  );
}
