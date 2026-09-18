"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Radio, BarChart3, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const TABS: Tab[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/leaks", label: "Search leaks", icon: Search },
  { href: "/dashboard/channels", label: "Channels", icon: Radio },
];

const OWNER_TAB: Tab = {
  href: "/dashboard/analytics",
  label: "Analytics",
  icon: BarChart3,
};

/**
 * Persistent sub-navigation across the dashboard's pages. The Analytics tab is
 * owner-only, so it's shown only when `owner` is true.
 */
export function DashboardTabs({ owner = false }: { owner?: boolean }) {
  const pathname = usePathname();
  const tabs = owner ? [...TABS, OWNER_TAB] : TABS;
  return (
    <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
