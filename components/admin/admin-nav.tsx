"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  TrendingUp,
  BarChart3,
  Megaphone,
  Mail,
  LayoutGrid,
  Search,
  Radio,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The admin-only menu: a sticky sidebar on desktop, a scrollable row of links
 * on phones. Dashboard sections are anchors on /dashboard; the rest are pages.
 */

type Item = { href: string; label: string; icon: LucideIcon; id: string };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Admin",
    items: [
      { id: "overview", href: "/dashboard", label: "Overview", icon: Bell },
      { id: "growth", href: "/dashboard#growth", label: "Signups", icon: TrendingUp },
      { id: "analytics", href: "/dashboard#analytics", label: "Analytics", icon: BarChart3 },
      { id: "placements", href: "/admin/placements", label: "Paid placements", icon: Megaphone },
      { id: "emails", href: "/admin/emails", label: "Emails", icon: Mail },
    ],
  },
  {
    title: "Your sites",
    items: [
      { id: "sites", href: "/dashboard#sites", label: "Your sites", icon: LayoutGrid },
      { id: "leaks", href: "/dashboard/leaks", label: "Search leaks", icon: Search },
      { id: "channels", href: "/dashboard/channels", label: "Channels", icon: Radio },
    ],
  },
];

function activeId(pathname: string, hash: string): string {
  if (pathname.startsWith("/admin/placements")) return "placements";
  if (pathname.startsWith("/admin/emails")) return "emails";
  if (pathname.startsWith("/dashboard/leaks")) return "leaks";
  if (pathname.startsWith("/dashboard/channels")) return "channels";
  if (pathname === "/dashboard") {
    if (hash === "#growth") return "growth";
    if (hash === "#analytics") return "analytics";
    if (hash === "#sites") return "sites";
    return "overview";
  }
  return "";
}

export function AdminNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);
  const active = activeId(pathname, hash);

  const badge = (item: Item) =>
    item.id === "overview" && unread > 0 ? (
      <span className="ml-auto rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
        {unread}
      </span>
    ) : null;

  return (
    <>
      {/* Phones and tablets: one scrollable row. */}
      <nav aria-label="Admin" className="-mx-4 mb-6 overflow-x-auto px-4 lg:hidden">
        <ul className="flex w-max gap-2">
          {GROUPS.flatMap((g) => g.items).map((item) => {
            const Icon = item.icon;
            const on = item.id === active;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  onClick={() => setHash(item.href.includes("#") ? `#${item.href.split("#")[1]}` : "")}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm",
                    on ? "border-primary bg-primary/10 font-medium text-foreground" : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                  {badge(item)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop: sticky sidebar. */}
      <aside aria-label="Admin" className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
        {GROUPS.map((g) => (
          <div key={g.title} className="mb-6">
            <p className="px-3 pb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">{g.title}</p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                const on = item.id === active;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setHash(item.href.includes("#") ? `#${item.href.split("#")[1]}` : "")}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                        on ? "bg-primary/10 font-semibold text-primary" : "text-foreground/90 hover:bg-accent",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                      {badge(item)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ExternalLink className="size-4" /> Public site
        </Link>
      </aside>
    </>
  );
}
