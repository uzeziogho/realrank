import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, ShieldCheck, Share2 } from "lucide-react";
import { ReportCardForm } from "@/components/report-card-form";
import { siteConfig } from "@/lib/config";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Traffic Report Card — Grade Any Site's Organic Traffic",
  description:
    "Enter any domain and get an instant organic-traffic report card — its verified momentum, rank, and grade on RealRank. Free, no login. Verified Google Search Console data, not estimates.",
  alternates: { canonical: "/report-card" },
  openGraph: {
    title: "Traffic Report Card — Grade Any Site's Organic Traffic",
    description: "Instant organic-traffic report card for any domain. Free, no login.",
    url: `${siteConfig.url}/report-card`,
  },
};

export default function ReportCardLanding() {
  return (
    <>
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-14 text-center sm:py-20">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground">
            <ClipboardCheck className="size-4 text-primary" /> Free · no login
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Traffic report card
          </h1>
          <p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
            Enter any domain and get an instant organic-traffic report card — its verified
            momentum, rank, and grade. Then see how yours stacks up.
          </p>
          <div className="mt-8 flex w-full justify-center">
            <ReportCardForm autoFocus />
          </div>
        </div>
      </section>

      <div className="container max-w-2xl py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          <Perk icon={<ShieldCheck className="size-5" />} title="Verified, not estimated" body="Grades come from real Google Search Console clicks — no third-party guesses." />
          <Perk icon={<ClipboardCheck className="size-5" />} title="Instant grade" body="An A–F momentum grade and the site's live rank, in one click." />
          <Perk icon={<Share2 className="size-5" />} title="Shareable" body="Every report card has its own link — post it, or challenge a competitor." />
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
          <h2 className="text-xl font-semibold tracking-tight">Want your grade to be verified?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Connect Google Search Console (read-only) and your real momentum decides your rank on
            the public board.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Connect my Search Console →
          </Link>
        </div>
      </div>
    </>
  );
}

function Perk({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
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
