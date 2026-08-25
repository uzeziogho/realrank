import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Server-rendered, crawlable pagination. Links are real <a> hrefs (via next/link)
 * so search engines can follow to every page of the leaderboard.
 */
export function Pagination({
  currentPage,
  totalPages,
  buildHref,
}: {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(currentPage, totalPages);
  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);

  return (
    <nav
      aria-label="Leaderboard pages"
      className="mt-6 flex items-center justify-center gap-1"
    >
      <PageLink
        href={buildHref(prev)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" />
      </PageLink>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-2 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <PageLink key={p} href={buildHref(p)} active={p === currentPage}>
            {p}
          </PageLink>
        ),
      )}

      <PageLink
        href={buildHref(next)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  children,
  active,
  disabled,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const cls = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border text-foreground hover:bg-accent",
    disabled && "pointer-events-none opacity-40",
  );

  if (disabled) {
    return (
      <span className={cls} aria-disabled {...rest}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

/** Compact page list: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(current: number, total: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  const add = (n: number) => out.push(n);

  if (total <= 7) {
    for (let i = 1; i <= total; i++) add(i);
    return out;
  }

  add(1);
  if (current > 3) out.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    add(i);
  }
  if (current < total - 2) out.push("…");
  add(total);
  return out;
}
