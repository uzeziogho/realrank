import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ListingCard } from "@/components/listing-card";
import { getAlternativeTargets, getListingsForAlternative } from "@/lib/listed";
import { siteConfig } from "@/lib/config";

// Revalidate alongside the listings cache; allow new targets to render
// on-demand as listings add them (no full rebuild needed).
export const revalidate = 300;
export const dynamicParams = true;

type Params = Promise<{ tool: string }>;

export async function generateStaticParams() {
  const targets = await getAlternativeTargets();
  return targets.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tool } = await params;
  const group = await getListingsForAlternative(tool);
  if (!group) return { title: "Alternatives", robots: { index: false, follow: true } };
  const title = `Free ${group.name} alternatives — listed on ${siteConfig.name}`;
  return {
    title,
    description: `Independent, free and open ${group.name} alternatives listed on ${siteConfig.name}. Each one is owner-verified with a badge — a community directory, not a paid ranking.`,
    alternates: { canonical: `/alternatives-to/${tool}` },
    openGraph: { title, url: `${siteConfig.url}/alternatives-to/${tool}` },
  };
}

export default async function AlternativesToPage({ params }: { params: Params }) {
  const { tool } = await params;
  const group = await getListingsForAlternative(tool);
  if (!group) notFound();

  const { name, listings } = group;

  return (
    <div className="container max-w-3xl py-12">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Directory", href: "/listed" },
          { name: "Alternatives to", href: "/alternatives-to" },
          { name },
        ]}
      />

      <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight">
        Free {name} alternatives
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        {listings.length} independent {listings.length === 1 ? "project" : "projects"} listed on{" "}
        {siteConfig.name} as {listings.length === 1 ? "an alternative" : "alternatives"} to {name}.
        Each one added our badge to earn its spot — a community directory, not a paid ranking.
      </p>

      <ul className="mt-8 grid gap-3 md:grid-cols-2">
        {listings.map((l) => (
          <ListingCard key={l.host} listing={l} />
        ))}
      </ul>

      {/* Honest framing: this is the directory tier, distinct from the verified board. */}
      <section className="mt-12 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">
          How this list works
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This is the open directory on {siteConfig.name}: anyone can list a project free by
          adding our badge to their site, and they self-declare the tool they&apos;re an
          alternative to. It is deliberately <strong className="text-foreground">not</strong>{" "}
          ranked by traffic. For sites ranked by{" "}
          <strong className="text-foreground">verified</strong> Google Search Console clicks —
          real measured momentum, no estimates, no pay-to-win — see the{" "}
          <Link href="/leaderboard" className="text-primary hover:underline">
            main leaderboard
          </Link>
          .
        </p>
      </section>

      {/* Conversion band */}
      <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center">
        <ShieldCheck className="size-6 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">
          Built a {name} alternative?
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          List it free — add the {siteConfig.name} badge to your site and you&apos;re on the
          board with a permanent link. Connect Search Console later for a verified, ranked spot.
        </p>
        <Button asChild className="mt-1">
          <Link href="/submit">
            <Plus className="size-4" /> List your project — free
          </Link>
        </Button>
      </div>
    </div>
  );
}
