import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms",
  description: `Terms of use for ${siteConfig.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="container max-w-2xl py-16">
      <h1 className="text-3xl font-bold tracking-tight">Terms</h1>
      <div className="mt-6 space-y-4 text-muted-foreground">
        <p>
          By publishing a site to {siteConfig.name}, you confirm you own or manage
          the verified Google Search Console property and consent to displaying its
          aggregate organic click totals on the public leaderboard.
        </p>
        <p>
          Rankings are provided as-is for informational purposes. Sponsored
          placements are clearly labeled and do not affect organic scores.
        </p>
        <p className="text-sm">This is placeholder copy for the MVP. Replace before launch.</p>
      </div>
    </div>
  );
}
