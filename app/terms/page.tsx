import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that govern your use of ${siteConfig.name}, the public organic traffic leaderboard.`,
  alternates: { canonical: "/terms" },
};

const UPDATED = "August 26, 2026";
const CONTACT = "support@realrank.lol";

export default function TermsPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
        <Section title="1. Acceptance">
          <p>
            By accessing or using {siteConfig.name} (the “Service”), you agree to
            these Terms. If you do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="2. What the Service does">
          <p>
            {siteConfig.name} is a public leaderboard that ranks websites by verified
            organic search performance. Site owners connect Google Search Console
            (read-only) and choose which verified properties to publish; we read
            their aggregate organic click totals and rank them by momentum (growth
            velocity) or total volume.
          </p>
        </Section>

        <Section title="3. Eligibility & accounts">
          <p>
            You must be able to form a binding contract and connect a Google account
            you are authorized to use. You are responsible for activity that occurs
            through your connection.
          </p>
        </Section>

        <Section title="4. Your responsibilities">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Only publish sites you own or are authorized to manage in Google Search
              Console.
            </li>
            <li>
              Provide accurate site information (name, URL, description, category).
            </li>
            <li>
              Do not attempt to manipulate rankings, submit misleading data, or
              disrupt the Service.
            </li>
            <li>Do not publish unlawful, infringing, or harmful content.</li>
          </ul>
          <p className="mt-3">
            By publishing a property, you consent to displaying its aggregate organic
            click totals and derived scores on the public leaderboard.
          </p>
        </Section>

        <Section title="5. Rankings">
          <p>
            Rankings are provided “as is” for informational purposes, computed from
            data supplied by Google Search Console. We do not guarantee accuracy,
            completeness, or availability, and rankings may change as data refreshes
            or methodology evolves.
          </p>
        </Section>

        <Section title="6. Sponsored placements">
          <p>
            The Service may display sponsored placements. These are clearly labeled
            “Sponsored,” are inserted at fixed positions, and do <strong>not</strong>{" "}
            affect the organic scores or order of any listed site.
          </p>
        </Section>

        <Section title="7. Intellectual property">
          <p>
            You retain all rights to your site content. You grant {siteConfig.name} a
            limited license to display the information you publish for the purpose of
            operating the leaderboard. The Service’s own software, design, and brand
            remain our property.
          </p>
        </Section>

        <Section title="8. Disclaimers">
          <p>
            The Service is provided “as is” and “as available,” without warranties of
            any kind, express or implied, including merchantability, fitness for a
            particular purpose, and non-infringement.
          </p>
        </Section>

        <Section title="9. Limitation of liability">
          <p>
            To the maximum extent permitted by law, {siteConfig.name} will not be
            liable for any indirect, incidental, special, consequential, or punitive
            damages, or any loss of profits, data, or goodwill arising from your use
            of the Service.
          </p>
        </Section>

        <Section title="10. Termination">
          <p>
            You may stop using the Service and disconnect Google at any time. We may
            suspend or terminate access that violates these Terms or harms the Service
            or other users.
          </p>
        </Section>

        <Section title="11. Changes">
          <p>
            We may update these Terms from time to time. Continued use after changes
            take effect constitutes acceptance. Material changes are reflected by the
            “Last updated” date above.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these Terms? Email{" "}
            <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</a>.
          </p>
        </Section>
      </div>

      <div className="mt-12 border-t border-border/60 pt-6 text-sm">
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy →</Link>
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
