import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ShieldCheck, TrendingUp, Award, Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyLink } from "@/components/copy-link";
import { getFoundingInfo } from "@/lib/data";
import { siteConfig } from "@/lib/config";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Founding Sites — Claim a Founder Spot on RealRank",
  description:
    "The first 50 sites on RealRank become founding members: a permanent Founder badge, top billing while the board is small, and first-mover discovery. Connect Google Search Console to claim your spot — free.",
  alternates: { canonical: "/founding" },
};

export default async function FoundingPage() {
  const founding = await getFoundingInfo();
  const pct = Math.round((founding.claimed / founding.total) * 100);
  const shareUrl = `${siteConfig.url}/founding`;
  const shareText = `${siteConfig.name} is opening its board — the first ${founding.total} sites become founding members with a permanent Founder badge. Ranked by verified organic momentum (Google Search Console), not estimates. ${founding.spotsLeft} spots left 👇`;
  const xIntent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-16 text-center sm:py-20">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="size-4" /> Founding program · open now
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Be a founding site on {siteConfig.name}
          </h1>
          <p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
            The board is new — and that&apos;s the opportunity. The first{" "}
            {founding.total} sites to connect become <strong className="text-foreground">founding
            members</strong>: a permanent badge, top billing while it&apos;s quiet, and first-mover
            discovery as it grows.
          </p>

          {/* Scarcity */}
          <div className="mt-8 w-full max-w-md rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Founding spots</span>
              <span className="text-sm font-semibold tabular-nums">
                {founding.claimed} / {founding.total} claimed
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-medium text-primary">
              {founding.spotsLeft > 0
                ? `${founding.spotsLeft} founding spots left`
                : "Founding spots are full — join the board anyway"}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Claim your founding spot <ArrowRight className="size-4" />
              </Link>
            </Button>
            <a
              href={xIntent}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Share2 className="size-4" /> Invite a founder
            </a>
            <CopyLink url={shareUrl} label="Copy invite link" />
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="container max-w-4xl py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          <Perk
            icon={<Award className="size-5" />}
            title="Permanent Founder badge"
            body="A Founder mark on your row, profile, and rank card — proof you were here first, kept for good."
          />
          <Perk
            icon={<TrendingUp className="size-5" />}
            title="Top billing while it's quiet"
            body="Fewer sites means an easier climb. Rank high now and ride the momentum as the board fills up."
          />
          <Perk
            icon={<ShieldCheck className="size-5" />}
            title="Verified from day one"
            body="Your rank is real organic clicks from Google Search Console — read-only, free, no pay-to-win."
          />
        </div>

        {/* How */}
        <div className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">How to claim your spot</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <Step n={1}>
              Connect Google Search Console (read-only). It takes about 30 seconds.
            </Step>
            <Step n={2}>
              Pick which verified properties to publish — your real clicks, nothing self-reported.
            </Step>
            <Step n={3}>
              You&apos;re on the board with a Founder badge. Share your rank card and climb.
            </Step>
          </ol>
          <Button asChild className="mt-6">
            <Link href="/login">
              Connect Search Console <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        {/* Recruit */}
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <h2 className="text-lg font-semibold tracking-tight">Know a builder who should be here?</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Founding spots are limited. Send this page to a founder who&apos;s shipping —
            they&apos;ll thank you when they&apos;re #1.
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            <a
              href={xIntent}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Share2 className="size-4" /> Share on X
            </a>
            <CopyLink url={shareUrl} label="Copy invite link" />
          </div>
        </div>
      </section>
    </>
  );
}

function Perk({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {n}
      </span>
      <span className="pt-0.5 text-foreground">{children}</span>
    </li>
  );
}
