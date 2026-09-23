import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { AuthNav } from "@/components/auth-nav";
import { MobileNav } from "@/components/mobile-nav";
import { NavMenu } from "@/components/nav-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { boardLinks, toolLinks, memberLinks, learnLinks, guideLinks } from "@/lib/config";

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
          {/* Journey order: browse the board, explore its cuts, use a tool, learn. */}
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/leaderboard">Leaderboard</Link>
          </Button>
          <NavMenu label="Boards" sections={[{ links: boardLinks }]} />
          <NavMenu
            label="Tools"
            sections={[
              { label: "Free, no login", links: toolLinks },
              { label: "For connected sites", links: memberLinks },
            ]}
          />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/stats">Stats</Link>
          </Button>
          <NavMenu
            label="Learn"
            sections={[{ links: learnLinks }, { label: "Guides", links: guideLinks }]}
          />
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
