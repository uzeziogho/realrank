"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { boardLinks, toolLinks, memberLinks, learnLinks, guideLinks, makerLinks } from "@/lib/config";

const SECTIONS = [
  { label: "Boards", links: boardLinks },
  // The two headline actions sit as buttons above; this keeps Spotlight + Pricing reachable.
  { label: "For makers", links: makerLinks.filter((l) => l.href !== "/submit" && l.href !== "/login") },
  { label: "Free tools", links: toolLinks },
  { label: "For connected sites", links: memberLinks },
  { label: "Learn", links: learnLinks },
  { label: "Guides", links: guideLinks },
] as const;

/**
 * Mobile-only nav. The header's inline links are hidden below `md`, so this
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
    <div className="md:hidden">
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
            {/* The two ways onto RealRank, first — then a way back in for owners. */}
            <div className="flex flex-col gap-2 px-1 pb-2">
              <Link
                href="/submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-base font-medium text-primary-foreground"
              >
                <Plus className="size-4" /> List your project — free
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border text-base font-medium"
              >
                <ShieldCheck className="size-4" /> Get a verified rank
              </Link>
              <p className="text-center text-sm text-muted-foreground">
                Already connected?{" "}
                <Link href="/login" className="font-medium text-primary">
                  Sign in
                </Link>
              </p>
            </div>
            {SECTIONS.map((section) => (
              <div key={section.label} className="flex flex-col gap-1">
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
