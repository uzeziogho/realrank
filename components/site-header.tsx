import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { AuthNav } from "@/components/auth-nav";
import { MobileNav } from "@/components/mobile-nav";
import { FeaturesMenu } from "@/components/features-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { primaryNav } from "@/lib/config";

/**
 * Static server component — no per-request data — so every page that uses the
 * layout can still be statically/ISR rendered. Auth state is handled by the
 * client <AuthNav /> to avoid forcing dynamic rendering on public pages.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" aria-label="RealRank home" className="flex items-center">
          <Logo markSize={24} />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {primaryNav.map((l) => (
            <Button
              key={l.href}
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
          <FeaturesMenu />
          {/* Divider between navigation and account/theme actions (desktop) */}
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden="true" />
          <ThemeToggle />
          <AuthNav />
          <MobileNav />
        </nav>
      </div>
    </header>
  );
}
