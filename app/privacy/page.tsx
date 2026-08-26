import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} collects, uses, and protects your data, including Google Search Console data accessed with your permission.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "August 26, 2026";
const CONTACT = "privacy@realrank.lol";

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <Section title="Overview">
          <p>
            {siteConfig.name} (“we”, “us”) operates a public leaderboard that ranks
            websites by verified organic search performance. This policy explains
            what we collect, how we use it, and the choices you have. We collect the
            minimum needed to run the service and never sell your data.
          </p>
        </Section>

        <Section title="Information we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Google account identity.</strong>{" "}
              When you connect Google, we receive your Google account email address
              and a unique identifier, used solely to create and identify your
              account.
            </li>
            <li>
              <strong className="text-foreground">Google Search Console data.</strong>{" "}
              With your permission (the read-only{" "}
              <code className="text-foreground">webmasters.readonly</code> scope), we
              read the list of your verified properties and their aggregate organic
              click totals (last 7 and 28 days) for the properties you choose to
              publish.
            </li>
            <li>
              <strong className="text-foreground">Content you publish.</strong>{" "}
              Site name, URL, description, and category you choose to display on the
              public leaderboard.
            </li>
            <li>
              <strong className="text-foreground">Basic technical data.</strong>{" "}
              Standard server logs and a session cookie required to keep you
              connected. We do not use advertising trackers.
            </li>
          </ul>
        </Section>

        <Section title="How we use your information">
          <ul className="list-disc space-y-2 pl-5">
            <li>To compute momentum and volume rankings from your click totals.</li>
            <li>To display the sites you choose to publish on the public leaderboard.</li>
            <li>To refresh your published sites’ click totals on a schedule.</li>
            <li>To operate, secure, and improve the service.</li>
          </ul>
          <p className="mt-3">
            Only the aggregate numbers and details you choose to publish are shown
            publicly. Individual search queries, pages, countries, and devices are
            never requested, stored, or displayed.
          </p>
        </Section>

        <Section title="Google user data — Limited Use">
          <p>
            {siteConfig.name}’s use and transfer of information received from Google
            APIs adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google API Services User Data Policy
            </a>
            , including its Limited Use requirements. Specifically:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>We only request read-only Search Console access.</li>
            <li>
              We use the data solely to provide and improve the leaderboard features
              you can see.
            </li>
            <li>We do not sell Google user data or use it for advertising.</li>
            <li>
              We do not transfer Google user data to third parties except as needed
              to operate the service (see “Service providers”), for security, or to
              comply with law.
            </li>
            <li>No humans read your data except with your consent or for security.</li>
          </ul>
        </Section>

        <Section title="How we store and protect it">
          <p>
            Your Google refresh token is encrypted at rest using AES-256-GCM and is
            only ever decrypted on our servers immediately before an authorized API
            call. It is never sent to the browser. Access to production data is
            restricted, and public reads are limited by database row-level security.
          </p>
        </Section>

        <Section title="Service providers">
          <p>We rely on a small number of processors to run the service:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">Supabase</strong> — authentication and database hosting.</li>
            <li><strong className="text-foreground">Vercel</strong> — application hosting.</li>
            <li><strong className="text-foreground">Google</strong> — source of the Search Console data you authorize.</li>
          </ul>
        </Section>

        <Section title="Data retention & deletion">
          <p>
            You can unpublish any site at any time, or disconnect Google from your
            dashboard — which removes your stored access token. To delete your account
            and all associated data, email us at{" "}
            <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</a>{" "}
            and we will remove it promptly. You can also revoke {siteConfig.name}’s
            access at any time from your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google account permissions
            </a>
            .
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Depending on where you live, you may have rights to access, correct, or
            delete your personal data. Contact us at{" "}
            <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</a>{" "}
            to exercise them.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy from time to time. Material changes will be
            reflected by the “Last updated” date above.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions? Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</a>.
          </p>
        </Section>
      </div>

      <div className="mt-12 border-t border-border/60 pt-6 text-sm">
        <Link href="/terms" className="text-primary hover:underline">Terms of Service →</Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
