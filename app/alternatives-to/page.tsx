import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getAlternativeTargets } from "@/lib/listed";
import { siteConfig } from "@/lib/config";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const targets = await getAlternativeTargets();
  return {
    title: `Alternatives to popular tools — the ${siteConfig.name} directory`,
    description: `Browse free, independent alternatives to the tools you already use — listed by indie makers on ${siteConfig.name}. A community directory, not a paid ranking.`,
    alternates: { canonical: "/alternatives-to" },
    // Thin until listings declare targets — keep it out of the index while empty.
    ...(targets.length === 0 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function AlternativesToIndexPage() {
  const targets = await getAlternativeTargets();

  return (
    <div className="container max-w-3xl py-12">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Directory", href: "/listed" },
          { name: "Alternatives to" },
        ]}
      />

      <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight">
        Alternatives to popular tools
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Free, independent alternatives listed by makers on {siteConfig.name}. Each project
        added our badge to earn its spot — a community directory, not a paid ranking.
      </p>

      {targets.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
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
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {targets.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/alternatives-to/${t.slug}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40"
              >
                <span className="min-w-0">
                  <span className="font-semibold">{t.name} alternatives</span>
                  <span className="ml-2 text-sm text-muted-foreground tabular-nums">{t.count}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
