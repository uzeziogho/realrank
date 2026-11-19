import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle, Loader2, Trophy, ArrowRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WelcomePublish } from "@/components/dashboard/welcome-publish";
import { getOptionalUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listUserProperties } from "@/lib/gsc-server";
import { getLeaderboardData } from "@/lib/data";
import { siteSlug } from "@/lib/site";
import { siteConfig } from "@/lib/config";
import { comebackStatus } from "@/lib/comeback";
import { cn, formatCompact, formatGrowth, hostname } from "@/lib/utils";
import type { PublishedSite } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You're connected",
  robots: { index: false, follow: false },
};

/**
 * Where people land right after connecting Search Console. The first minute
 * decides whether they come back, so it never shows an empty rank: a site with
 * clicks sees its place on the board straight away; a brand-new site sees that
 * it's verified and exactly what happens next.
 */
export default async function WelcomePage() {
  const user = await getOptionalUser();
  if (!user) redirect("/login?next=/dashboard/welcome");

  const supabase = await createClient();
  const [{ data: sites }, properties, board] = await Promise.all([
    supabase.from("published_sites").select("*").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }),
    listUserProperties(user.id),
    getLeaderboardData("momentum").catch(() => null),
  ]);
  const mine = (sites ?? []) as PublishedSite[];
  const ranked = board?.organic.filter((s) => !s.pending) ?? [];
  const unpublished = properties.filter((p) => !mine.some((s) => s.site_url === p));

  return (
    <div className="container max-w-2xl py-12">
      <p className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-sm font-medium text-success">
        <CheckCircle2 className="size-4" /> Search Console connected
      </p>
      <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight">
        {mine.length ? "You're on RealRank" : "You're in. Let's rank your site."}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Read-only access: we only ever see click counts — never your queries, pages or revenue.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {mine.length === 0 ? (
          <WelcomePublish properties={properties} />
        ) : (
          mine.map((site) => {
            const row = board?.organic.find((r) => r.id === site.id);
            const rank = row && !row.pending ? row.rank : null;
            return rank ? (
              <RankedCard key={site.id} site={site} rank={rank} total={ranked.length} growth={row!.growthRate} clicks7d={row!.clicks7d} />
            ) : (
              <WaitingCard key={site.id} site={site} hasHistory={site.clicks_28d > 0} />
            );
          })
        )}
      </div>

      {mine.length > 0 && unpublished.length > 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          You have {unpublished.length} more verified {unpublished.length === 1 ? "site" : "sites"} —{" "}
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            rank {unpublished.length === 1 ? "it" : "them"} from your dashboard
          </Link>
          .
        </p>
      )}

      {mine.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">
              Go to your dashboard <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/leaderboard">See the full board</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function RankedCard({
  site,
  rank,
  total,
  growth,
  clicks7d,
}: {
  site: PublishedSite;
  rank: number;
  total: number;
  growth: number;
  clicks7d: number;
}) {
  const slug = siteSlug(site.site_url);
  const shareText = `${site.display_name} is #${rank} on ${siteConfig.name} — the leaderboard ranked by real Google Search Console clicks, not estimates.`;
  const shareUrl = `${siteConfig.url}/site/${slug}`;
  return (
    <section className="rounded-2xl border border-primary/30 bg-primary/[0.05] p-6">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
        <Trophy className="size-4" /> {hostname(site.site_url)}
      </p>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="text-5xl font-bold tabular-nums tracking-tight">#{rank}</span>
        <span className="text-muted-foreground">of {total} on the momentum board</span>
      </p>
      <p className="mt-2 text-sm">
        <span className={cn("font-semibold", growth >= 0 ? "text-success" : "text-danger")}>{formatGrowth(growth)}</span>{" "}
        <span className="text-muted-foreground">this week · {formatCompact(clicks7d)} verified clicks in 7 days</span>
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Ranked from your last 28 days in Search Console. The board refreshes daily — grow your clicks and you climb.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/site/${slug}`}>See your public profile</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Share2 className="size-4" /> Share your rank
          </a>
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Also free:{" "}
        <Link href="/dashboard#directory" className="font-medium text-primary hover:underline">
          add it to the directory
        </Link>{" "}
        — it&apos;s verified already, so it gets a followed link, and you can book a Spotlight for extra visitors.
      </p>
    </section>
  );
}

/** Verified, but nothing to rank on yet — say so, and say what happens next. */
function WaitingCard({ site, hasHistory }: { site: PublishedSite; hasHistory: boolean }) {
  const steps = [
    { label: "Search Console connected", done: true },
    { label: "Site verified", done: true },
    { label: hasHistory ? "Clicks this week" : "First clicks from Google", done: false, active: true },
    { label: "On the board", done: false },
  ];
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{hostname(site.site_url)}</p>
      <p className="mt-2 text-xl font-semibold">You&apos;re verified ✓ — you&apos;ll appear on the board as soon as clicks land.</p>
      <ol className="mt-5 space-y-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3 text-sm">
            {s.done ? (
              <CheckCircle2 className="size-5 shrink-0 text-success" />
            ) : s.active ? (
              <Loader2 className="size-5 shrink-0 animate-spin text-primary" />
            ) : (
              <Circle className="size-5 shrink-0 text-muted-foreground/50" />
            )}
            <span className={cn(s.done ? "text-foreground" : s.active ? "font-medium text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-sm text-muted-foreground">
        {hasHistory
          ? "Your site had clicks earlier this month but none in the last 7 days, so it's waiting for this week's clicks. "
          : "Google hasn't recorded organic clicks for this site yet. "}
        Search Console reports clicks with a 2–3 day delay, and we check every day — you&apos;ll move onto the board
        automatically.{" "}
        {comebackStatus().enabled ? "We'll email you the day it happens." : "Nothing else to do."}
      </p>
      <div className="mt-5 rounded-xl bg-muted/50 p-4 text-sm">
        <p className="font-medium">While you wait</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          <li>
            <Link href="/dashboard#directory" className="text-primary hover:underline">Add it to the directory</Link> — it&apos;s
            verified already, so it gets a followed link and can book a Spotlight.
          </li>
          <li>
            <Link href={`/site/${siteSlug(site.site_url)}`} className="text-primary hover:underline">See your public profile</Link>{" "}
            — it fills in as data arrives.
          </li>
        </ul>
      </div>
    </section>
  );
}
