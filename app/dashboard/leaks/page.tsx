import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeaksPanel } from "@/components/dashboard/leaks-panel";
import { getSearchLeaks } from "@/lib/leaks";
import { listUserProperties } from "@/lib/gsc-server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getOptionalUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Search leaks",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ site?: string }>;

export default async function LeaksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) redirect("/dashboard");

  const user = await getOptionalUser();
  if (!user) redirect("/login");

  const properties = await listUserProperties(user.id);
  const requested = (await searchParams).site;
  const selected =
    requested && properties.includes(requested) ? requested : properties[0];

  const leaks = selected ? await getSearchLeaks(user.id, selected) : null;

  return (
    <div className="container max-w-4xl py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Dashboard
      </Link>

      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Search leaks</h1>
        <p className="mt-1 text-muted-foreground">
          Where organic traffic — and the revenue behind it — leaks before it
          reaches your site: rankings that don&apos;t earn the click, and queries
          stuck just off page 1. Straight from your verified Search Console data.
        </p>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Connect Google Search Console</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search-leak analysis reads your real per-query impressions and clicks.
            Connect Search Console (read-only) to see where you&apos;re losing clicks.
          </p>
          <div className="mt-4">
            <Button asChild>
              <a href="/api/auth/google/start">
                Connect with Google
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <LeaksPanel properties={properties} selected={selected!} leaks={leaks} />
      )}
    </div>
  );
}
