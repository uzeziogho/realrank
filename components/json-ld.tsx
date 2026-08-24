import { siteConfig } from "@/lib/config";
import type { RankedSite } from "@/lib/types";

/**
 * Schema.org ItemList markup so search engines understand the leaderboard as a
 * ranked list. Rendered inside the server component -> present in initial HTML.
 */
export function LeaderboardJsonLd({ sites }: { sites: RankedSite[] }) {
  const json = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${siteConfig.name} — Organic Traffic Leaderboard`,
    description: siteConfig.description,
    numberOfItems: sites.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: sites.slice(0, 30).map((s) => ({
      "@type": "ListItem",
      position: s.rank,
      url: s.siteUrl,
      name: s.displayName,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}

export function WebsiteJsonLd() {
  const json = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
