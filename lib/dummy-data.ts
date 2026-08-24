import type { PublishedSite, SponsoredSlot } from "@/lib/supabase/types";
import { computeMomentum } from "@/lib/momentum";

/**
 * Realistic seed data for the leaderboard while the real GSC pipeline is wired up.
 * Numbers are hand-tuned to demonstrate momentum vs. volume divergence:
 * some small sites are exploding, some giants are flat or declining.
 */
interface Seed {
  site_url: string;
  display_name: string;
  description: string;
  category: string;
  clicks_7d: number;
  clicks_28d: number;
}

const SEEDS: Seed[] = [
  // Fast-growing small/mid sites — should shine in Momentum.
  { site_url: "https://finchpay.io", display_name: "FinchPay", description: "Instant payouts API for marketplaces.", category: "finance", clicks_7d: 4820, clicks_28d: 9100 },
  { site_url: "https://lumen-notes.app", display_name: "Lumen Notes", description: "AI note-taking that writes back.", category: "ai", clicks_7d: 3960, clicks_28d: 8200 },
  { site_url: "https://forgeui.dev", display_name: "ForgeUI", description: "Copy-paste React components for shipping fast.", category: "developer-tools", clicks_7d: 3110, clicks_28d: 6400 },
  { site_url: "https://hearthstore.co", display_name: "Hearth", description: "Warm, minimal home goods marketplace.", category: "ecommerce", clicks_7d: 2870, clicks_28d: 5900 },
  { site_url: "https://palettehq.com", display_name: "Palette HQ", description: "Brand color systems in one click.", category: "saas", clicks_7d: 2450, clicks_28d: 5200 },
  { site_url: "https://driftmail.com", display_name: "DriftMail", description: "Cold email that lands in the inbox.", category: "saas", clicks_7d: 2210, clicks_28d: 6800 },

  // Big established sites — win on Volume, flatter on Momentum.
  { site_url: "https://ledgerbase.com", display_name: "Ledgerbase", description: "Accounting for modern startups.", category: "finance", clicks_7d: 9800, clicks_28d: 41200 },
  { site_url: "https://shipfast.io", display_name: "ShipFast", description: "Logistics dashboard for DTC brands.", category: "ecommerce", clicks_7d: 8600, clicks_28d: 37800 },
  { site_url: "https://devlog.to", display_name: "Devlog", description: "Where developers publish and get read.", category: "media", clicks_7d: 12400, clicks_28d: 52000 },
  { site_url: "https://nimbusdb.dev", display_name: "NimbusDB", description: "Serverless Postgres that scales to zero.", category: "developer-tools", clicks_7d: 7300, clicks_28d: 33500 },
  { site_url: "https://cartwheel.shop", display_name: "Cartwheel", description: "Headless commerce for creators.", category: "ecommerce", clicks_7d: 6100, clicks_28d: 28900 },

  // Steady mid-market.
  { site_url: "https://quorumhr.com", display_name: "Quorum HR", description: "People ops without the spreadsheets.", category: "saas", clicks_7d: 3400, clicks_28d: 13100 },
  { site_url: "https://mapleboard.com", display_name: "Mapleboard", description: "Project planning that stays out of the way.", category: "saas", clicks_7d: 3050, clicks_28d: 12400 },
  { site_url: "https://synthwave.audio", display_name: "Synthwave", description: "Royalty-free tracks for indie games.", category: "media", clicks_7d: 2600, clicks_28d: 10400 },
  { site_url: "https://claritycrm.io", display_name: "Clarity CRM", description: "A CRM your sales team actually opens.", category: "saas", clicks_7d: 2900, clicks_28d: 11800 },
  { site_url: "https://vaultkeys.dev", display_name: "VaultKeys", description: "Secrets management for small teams.", category: "developer-tools", clicks_7d: 1980, clicks_28d: 8300 },

  // Newer entrants with strong recent spikes.
  { site_url: "https://prompthub.ai", display_name: "PromptHub", description: "Version control for your AI prompts.", category: "ai", clicks_7d: 2740, clicks_28d: 4900 },
  { site_url: "https://tallyframe.com", display_name: "TallyFrame", description: "Beautiful forms, zero code.", category: "saas", clicks_7d: 1820, clicks_28d: 3600 },
  { site_url: "https://greenroute.eco", display_name: "GreenRoute", description: "Carbon-aware delivery routing.", category: "marketplace", clicks_7d: 1560, clicks_28d: 3000 },
  { site_url: "https://beaconbi.com", display_name: "Beacon BI", description: "Dashboards that answer questions.", category: "saas", clicks_7d: 1740, clicks_28d: 5100 },

  // Declining / flat — should sink in Momentum.
  { site_url: "https://oldschoolcms.com", display_name: "OldSchool CMS", description: "The blogging platform from before.", category: "media", clicks_7d: 3200, clicks_28d: 18600 },
  { site_url: "https://legacymailer.net", display_name: "LegacyMailer", description: "Email marketing since 2009.", category: "saas", clicks_7d: 2100, clicks_28d: 12800 },
  { site_url: "https://staticstore.com", display_name: "StaticStore", description: "Simple storefronts, no frills.", category: "ecommerce", clicks_7d: 1400, clicks_28d: 8900 },

  // Long tail.
  { site_url: "https://kanjiflow.app", display_name: "KanjiFlow", description: "Learn Japanese by shipping streaks.", category: "media", clicks_7d: 1290, clicks_28d: 3400 },
  { site_url: "https://relaymetrics.com", display_name: "Relay Metrics", description: "Product analytics without the bloat.", category: "developer-tools", clicks_7d: 1180, clicks_28d: 4200 },
  { site_url: "https://harborhq.com", display_name: "Harbor", description: "Client portals for agencies.", category: "saas", clicks_7d: 990, clicks_28d: 3900 },
  { site_url: "https://swellwave.co", display_name: "Swellwave", description: "Community-led growth toolkit.", category: "marketplace", clicks_7d: 1120, clicks_28d: 2400 },
  { site_url: "https://novacharts.io", display_name: "NovaCharts", description: "Charting library for data teams.", category: "developer-tools", clicks_7d: 860, clicks_28d: 3100 },
  { site_url: "https://freshfold.com", display_name: "FreshFold", description: "Laundry pickup, on demand.", category: "marketplace", clicks_7d: 780, clicks_28d: 2600 },
  { site_url: "https://bloomcart.shop", display_name: "BloomCart", description: "Same-day flowers, everywhere.", category: "ecommerce", clicks_7d: 940, clicks_28d: 2100 },
];

const REFRESHED_AT = "2026-08-24T06:00:00.000Z";

export const DUMMY_SITES: PublishedSite[] = SEEDS.map((s, i) => {
  const { momentumScore, growthRate } = computeMomentum(s);
  return {
    id: `seed-${String(i + 1).padStart(3, "0")}`,
    user_id: `user-${String((i % 9) + 1).padStart(3, "0")}`,
    site_url: s.site_url,
    display_name: s.display_name,
    description: s.description,
    category: s.category,
    clicks_7d: s.clicks_7d,
    clicks_28d: s.clicks_28d,
    momentum_score: momentumScore,
    growth_rate: growthRate,
    is_active: true,
    last_refreshed_at: REFRESHED_AT,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: REFRESHED_AT,
  };
});

export const DUMMY_SPONSORED: SponsoredSlot[] = [
  {
    id: "spon-001",
    position_after_rank: 10,
    display_name: "Semrush",
    site_url: "https://www.semrush.com",
    description: "See every keyword your competitors rank for. Free 7-day trial.",
    cta_label: "Try free",
    is_active: true,
    starts_at: null,
    ends_at: null,
    created_at: "2026-08-01T00:00:00.000Z",
  },
  {
    id: "spon-002",
    position_after_rank: 20,
    display_name: "Ahrefs",
    site_url: "https://ahrefs.com",
    description: "Grow your search traffic with the industry-standard SEO toolset.",
    cta_label: "Start now",
    is_active: true,
    starts_at: null,
    ends_at: null,
    created_at: "2026-08-01T00:00:00.000Z",
  },
];
