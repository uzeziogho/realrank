import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${siteConfig.name} handles your Google Search Console data.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-2xl py-16 prose-invert">
      <h1 className="text-3xl font-bold tracking-tight">Privacy</h1>
      <div className="mt-6 space-y-4 text-muted-foreground">
        <p>
          {siteConfig.name} requests read-only access to Google Search Console
          (<code className="text-foreground">webmasters.readonly</code>). We use it
          only to read organic click totals for the properties you choose to
          publish.
        </p>
        <p>
          Your Google refresh token is encrypted at rest (AES-256-GCM) and is never
          sent to the browser. Only aggregate click counts and the momentum score
          you choose to publish are shown publicly.
        </p>
        <p>
          You can unpublish any property or disconnect your Google account at any
          time from your dashboard, which removes the stored token.
        </p>
        <p className="text-sm">This is placeholder copy for the MVP. Replace before launch.</p>
      </div>
    </div>
  );
}
