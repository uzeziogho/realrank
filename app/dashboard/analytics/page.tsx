import { redirect } from "next/navigation";

/**
 * Analytics now lives on the dashboard itself (owner only, at #analytics).
 * This keeps old links and bookmarks working, including ?period=.
 */
export default async function AnalyticsRedirect({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period } = await searchParams;
  redirect(`/dashboard${period ? `?period=${encodeURIComponent(period)}` : ""}#analytics`);
}
