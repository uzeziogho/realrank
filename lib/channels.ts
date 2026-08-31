import "server-only";

import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/config";

export interface ChannelStat {
  id: string;
  name: string;
  slug: string;
  destinationUrl: string;
  trackingUrl: string;
  visits: number;
  signups: number;
  customers: number;
  revenueCents: number;
  currency: string;
  /** Revenue (in cents) per visit — the "efficiency" of the channel. */
  revenuePerVisit: number;
  /** Paid conversions ÷ visits. */
  conversionRate: number;
}

export interface StripeConnectionStatus {
  connected: boolean;
  webhookUrl: string | null;
}

export function trackingUrl(slug: string): string {
  return `${siteConfig.url}/go/${slug}`;
}

/**
 * All of a user's channels with attributed stats, ranked by revenue then
 * efficiency. Aggregated in-process from click + conversion rows (fine at
 * indie scale; revisit with SQL rollups if a user ever has huge volume).
 */
export async function getChannelsWithStats(userId: string): Promise<ChannelStat[]> {
  try {
    return await loadChannels(userId);
  } catch (err) {
    console.error("[channels] getChannelsWithStats failed:", err);
    return [];
  }
}

async function loadChannels(userId: string): Promise<ChannelStat[]> {
  const supabase = await createClient();

  const { data: channels, error } = await supabase
    .from("channels")
    .select("id, name, slug, destination_url")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  // Missing table / not-yet-migrated → treat as no channels rather than throwing.
  if (error || !channels || channels.length === 0) return [];

  const ids = channels.map((c) => c.id);

  const [{ data: clicks }, { data: conversions }] = await Promise.all([
    supabase.from("channel_clicks").select("channel_id").in("channel_id", ids),
    supabase
      .from("channel_conversions")
      .select("channel_id, amount_cents, currency, type")
      .in("channel_id", ids),
  ]);

  const visitsBy = new Map<string, number>();
  for (const c of clicks ?? []) visitsBy.set(c.channel_id, (visitsBy.get(c.channel_id) ?? 0) + 1);

  const signupBy = new Map<string, number>();
  const custBy = new Map<string, number>();
  const revBy = new Map<string, number>();
  const curBy = new Map<string, string>();
  for (const c of conversions ?? []) {
    if (c.type === "signup") {
      signupBy.set(c.channel_id, (signupBy.get(c.channel_id) ?? 0) + 1);
      continue;
    }
    custBy.set(c.channel_id, (custBy.get(c.channel_id) ?? 0) + 1);
    revBy.set(c.channel_id, (revBy.get(c.channel_id) ?? 0) + (c.amount_cents ?? 0));
    if (!curBy.has(c.channel_id)) curBy.set(c.channel_id, c.currency ?? "usd");
  }

  const stats: ChannelStat[] = channels.map((c) => {
    const visits = visitsBy.get(c.id) ?? 0;
    const customers = custBy.get(c.id) ?? 0;
    const revenueCents = revBy.get(c.id) ?? 0;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      destinationUrl: c.destination_url,
      trackingUrl: trackingUrl(c.slug),
      visits,
      signups: signupBy.get(c.id) ?? 0,
      customers,
      revenueCents,
      currency: (curBy.get(c.id) ?? "usd").toUpperCase(),
      revenuePerVisit: visits > 0 ? revenueCents / visits : 0,
      conversionRate: visits > 0 ? customers / visits : 0,
    };
  });

  // Rank by revenue, then efficiency, then visits — "what actually pays" first.
  stats.sort(
    (a, b) =>
      b.revenueCents - a.revenueCents ||
      b.revenuePerVisit - a.revenuePerVisit ||
      b.visits - a.visits,
  );
  return stats;
}

export async function getStripeConnectionStatus(userId: string): Promise<StripeConnectionStatus> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stripe_connections")
      .select("webhook_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data?.webhook_token) return { connected: false, webhookUrl: null };
    return {
      connected: true,
      webhookUrl: `${siteConfig.url}/api/attribution/stripe/${data.webhook_token}`,
    };
  } catch (err) {
    console.error("[channels] getStripeConnectionStatus failed:", err);
    return { connected: false, webhookUrl: null };
  }
}
