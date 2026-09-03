import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, TrendingUp } from "lucide-react";
import { TrafficRealityCheck } from "@/components/traffic-reality-check";
import { siteConfig } from "@/lib/config";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Is My Traffic Real? — Estimated vs Verified Organic Traffic",
  description:
    "Free check: compare what SimilarWeb, Ahrefs or Semrush estimate for your organic traffic against your verified Google Search Console clicks — and see the gap. No login required.",
  alternates: { canonical: "/is-my-traffic-real" },
  openGraph: {
    title: "Is My Traffic Real? — Estimated vs Verified Organic Traffic",
    description:
      "See how far third-party traffic estimates are from your verified Search Console numbers.",
    url: `${siteConfig.url}/is-my-traffic-real`,
  },
};

export default function TrafficRealityPage() {
  return (
    <>
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col items-center py-14 text-center sm:py-20">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" /> Free · no login
          </span>
          <h1 className="max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Is my traffic real?
          </h1>
          <p className="mt-4 max-w-xl text-balance text-lg text-muted-foreground">
            Third-party tools guess your traffic from clickstream samples. Search
            Console counts your actual clicks. Enter both and see how big the gap is.
          </p>
        </div>
      </section>

      <div className="container max-w-2xl py-12">
        <TrafficRealityCheck />

        <div className="mt-14 space-y-10">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight">
              Why estimated and verified traffic disagree
            </h2>
            <p className="mt-3 text-muted-foreground">
              SimilarWeb, Ahrefs and Semrush don&apos;t see your real traffic. They model
              it — from browser-extension panels, clickstream data, and keyword-ranking
              math — then extrapolate. For big sites the estimates are directionally OK;
              for small and mid-size sites they can be off by 30–80% in either direction.
              Google Search Console, by contrast, is Google&apos;s own count of the clicks
              your pages actually received from search.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">
              Which number should you trust?
            </h2>
            <p className="mt-3 text-muted-foreground">
              The verified one — every time. It&apos;s the number you can show an
              investor, an acquirer, or a partner without a caveat. That&apos;s the whole
              idea behind RealRank: a public leaderboard where every site&apos;s traffic
              is pulled straight from its own Search Console, so nobody can pad the
              numbers.{" "}
              <Link href="/blog/verified-vs-estimated-traffic" className="text-primary hover:underline">
                Read the deeper dive →
              </Link>
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold tracking-tight">Prove your real number</h2>
            <p className="mt-2 text-muted-foreground">
              Connect Search Console (read-only), publish your verified traffic, and let
              it rank against everyone else&apos;s — no estimates, no pay-to-win.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <TrendingUp className="size-4" /> Get your verified rank
              </Link>
              <Link
                href="/momentum-score"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
              >
                Momentum score calculator
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
