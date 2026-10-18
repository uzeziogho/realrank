"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The board, as one thing with several cuts. These pages used to be six
 * separate nav items; this strip reframes them as tabs of a single board so
 * the IA reads as "the leaderboard, sliced" rather than a pile of boards.
 */
const VIEWS = [
  { href: "/leaderboard", label: "Top" },
  { href: "/movers", label: "Movers" },
  { href: "/underdogs", label: "Underdogs" },
  { href: "/launches", label: "Launches" },
  { href: "/listed", label: "Directory" },
] as const;

export function BoardViews({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Board views"
      className={cn(
        "flex flex-wrap items-center gap-1.5 overflow-x-auto",
        className,
      )}
    >
      {VIEWS.map((v) => {
        const active =
          v.href === "/leaderboard"
            ? pathname === "/leaderboard"
            : pathname === v.href || pathname.startsWith(`${v.href}/`);
        return (
          <Link
            key={v.href}
            href={v.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </Link>
        );
      })}
    </nav>
  );
}
