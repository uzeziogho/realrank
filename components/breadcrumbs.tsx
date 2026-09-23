import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { siteConfig } from "@/lib/config";

export interface Crumb {
  name: string;
  /** Omit on the current (last) page. */
  href?: string;
}

/**
 * Breadcrumb trail for deep pages (profiles, alternatives, compare). Renders a
 * visible nav plus schema.org BreadcrumbList structured data, which both helps
 * users orient and gives search engines the page's place in the site.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: `${siteConfig.url}${c.href}` } : {}),
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((c, i) => (
          <li key={`${c.name}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-border" />}
            {c.href ? (
              <Link href={c.href} className="truncate hover:text-foreground">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-foreground">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
