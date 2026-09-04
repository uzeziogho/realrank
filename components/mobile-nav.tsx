"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNav, toolLinks, guideLinks } from "@/lib/config";

const SECTIONS = [
  { label: null, links: primaryNav },
  { label: "Tools", links: toolLinks },
  { label: "Guides", links: guideLinks },
] as const;

/**
 * Mobile-only nav. The header's inline links are hidden below `sm`, so this
 * hamburger is the only way to reach them on a phone. Closes on route change
 * and when Escape is pressed.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the route changes (a link was tapped).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll + wire Escape while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div
          className="fixed inset-0 top-16 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <nav
            className="container flex max-h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto border-b border-border/60 bg-background py-4"
            onClick={(e) => e.stopPropagation()}
          >
            {SECTIONS.map((section) => (
              <div key={section.label ?? "primary"} className="flex flex-col gap-1">
                {section.label && (
                  <p className="mt-3 px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {section.label}
                  </p>
                )}
                {section.links.map((l) => {
                  const active =
                    l.href.startsWith("/#")
                      ? pathname === "/"
                      : pathname === l.href || pathname.startsWith(`${l.href}/`);
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={cn(
                        "rounded-md px-3 py-2.5 text-base font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted",
                      )}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
