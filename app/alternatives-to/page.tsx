import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AlternativesBrowser } from "@/components/alternatives-browser";
import { getAlternativeGroups } from "@/lib/listed";
import { siteConfig } from "@/lib/config";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const groups = await getAlternativeGroups();
  return {
    title: `Indie alternatives to the tools you pay for — the ${siteConfig.name} directory`,
    description: `Browse free, independent alternatives to the tools you already use — listed by indie makers on ${siteConfig.name}. A community directory, not a paid ranking.`,
    alternates: { canonical: "/alternatives-to" },
    // Thin until listings declare targets — keep it out of the index while empty.
    ...(groups.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function AlternativesToIndexPage() {
  const groups = await getAlternativeGroups();

  // Trim to the fields the client browser needs (keeps the payload small).
  const browserGroups = groups.map((g) => ({
    slug: g.slug,
    name: g.name,
    alts: g.listings.map((l) => ({
      host: l.host,
      displayName: l.displayName,
      tagline: l.tagline,
      category: l.category,
      pricing: l.pricing,
      ownerVerified: l.ownerVerified,
    })),
  }));

  return (
    <>
      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container flex flex-col gap-5 py-12">
          <Breadcrumbs
            items={[
              { name: "Home", href: "/" },
              { name: "Directory", href: "/listed" },
              { name: "Alternatives to" },
            ]}
          />
          <div className="flex max-w-3xl flex-col gap-3">
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Indie alternatives to the tools you already pay for.
            </h1>
            <p className="max-w-2xl text-pretty text-lg text-muted-foreground">
              Built by independent makers, listed for free. Each one added our badge to earn its
              spot — a community directory, not a paid ranking.
            </p>
          </div>
        </div>
      </section>

      <main className="container flex flex-col gap-6 py-10">
        {browserGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="font-medium">No alternatives listed yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Building something that replaces a tool people pay for? List it free and say what
              it&apos;s an alternative to.
            </p>
            <Button asChild className="mt-5">
              <Link href="/submit">
                <Plus className="size-4" /> List your project — free
              </Link>
            </Button>
          </div>
        ) : (
          <AlternativesBrowser groups={browserGroups} />
        )}

        {/* Dark CTA banner */}
        <div className="mt-2 grid grid-cols-1 items-center gap-5 rounded-2xl bg-foreground px-7 py-7 text-background sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-col gap-1.5">
            <p className="text-balance text-xl font-semibold tracking-tight">
              People search “[tool] alternatives” every day. Be the answer.
            </p>
            <p className="max-w-2xl text-sm text-background/70">
              List your project free and show up on the page for the tool you replace. Connect
              Search Console to get verified and ranked.
            </p>
          </div>
          <Link
            href="/submit"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" /> List your alternative
          </Link>
        </div>
      </main>
    </>
  );
}
