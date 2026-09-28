import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SubmitForm } from "@/components/submit-form";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "List your project — free",
  description: `List your project on ${siteConfig.name} for free. Get a permanent link and a spot on the directory, then connect Search Console to earn a verified, ranked spot.`,
  alternates: { canonical: "/submit" },
};

const PERKS = [
  "A permanent link to your listing",
  "A spot on the public directory today",
  "Optional verified checkmark via a badge embed",
  "Upgrade to a ranked spot by connecting Search Console",
];

export default function SubmitPage() {
  return (
    <div className="container max-w-2xl py-14">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">List your project for $0</h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Get on {siteConfig.name} today — no account, no card. Claim a permanent link now,
          and connect Search Console whenever you&apos;re ready for a verified, ranked spot.
        </p>
      </div>

      <ul className="mx-auto mt-8 flex max-w-md flex-col gap-2">
        {PERKS.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            {p}
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <SubmitForm />
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already listed?{" "}
        <Link href="/listed" className="text-primary hover:underline">
          See the directory
        </Link>{" "}
        or{" "}
        <Link href="/login" className="text-primary hover:underline">
          connect Search Console to get ranked
        </Link>
        .
      </p>
    </div>
  );
}
