import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChannelsPanel } from "@/components/dashboard/channels-panel";
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs";
import { getChannelsWithStats, getStripeConnectionStatus } from "@/lib/channels";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getOptionalUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Channels",
  robots: { index: false, follow: false },
};

export default async function ChannelsPage() {
  if (!isSupabaseConfigured()) redirect("/dashboard");

  const user = await getOptionalUser();
  if (!user) redirect("/login");

  const [channels, stripe] = await Promise.all([
    getChannelsWithStats(user.id),
    getStripeConnectionStatus(user.id),
  ]);

  return (
    <div className="container max-w-5xl py-10">
      <DashboardTabs />

      <div className="mt-8 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Channels</h1>
        <p className="mt-1 text-muted-foreground">
          Track which marketing channels actually bring paying customers — ranked by
          revenue and efficiency, so you know where to spend your time.
        </p>
      </div>

      <ChannelsPanel channels={channels} stripe={stripe} />
    </div>
  );
}
