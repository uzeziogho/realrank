import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { getListedSites } from "@/lib/listed";
import { getOutboundClicks } from "@/lib/data";
import { categories, categoryLabel, siteConfig } from "@/lib/config";

export const revalidate = 3600;

type Params = Promise<{ category: string }>;

// A roundup needs a few real entries to be worth indexing; below this it's
// noindex (still crawled) and left out of the sitemap, flipping to indexable
// on its own as the category fills.
const MIN_LISTED = 3;

const VALID = new Set<string>(categories.map((c) => c.slug));

export async function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category } = await params;
  if (!VALID.has(category)) return { title: "Not found", robots: { index: false, follow: false } };
  const label = categoryLabel(category);
  const listed = (await getListedSites()).filter((l) => l.category === category);
  const thin = listed.length < MIN_LISTED;
  const title = `Best ${label} tools & indie projects (2026)`;
  return {
    title,
    description: `A curated directory of ${label} tools and indie projects, each one real and listed on ${siteConfig.name} — not a pay-to-rank list. Browse ${listed.length} and find your next tool.`,
    alternates: { canonical: `/best/${category}` },
    keywords: [`best ${label} tools`, `${label} tools`, `free ${label} tools`, `indie ${label}`, `${label} directory`],
    openGraph: { title, url: `${siteConfig.url}/best/${category}` },
    ...(thin ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function BestCategoryPage({ params }: { params: Params }) {
  const { category } = await params;
  if (!VALID.has(category)) notFound();
  const label = categoryLabel(category);

  const [all, visits] = await Promise.all([getListedSites(), getOutboundClicks()]);
  const listed = all.filter((l) => l.category === category);
  const verifiedCount = listed.filter((l) => l.ownerVerified).length;

  const faq = [
    {
      q: `How are these ${label} tools chosen?`,
      a: `Every project here was submitted to the ${siteConfig.name} directory and passed a liveness and quality check — a real, reachable product, not a dead link or affiliate page. Placement is earned, never paid; you can't buy a spot.`,
    },
    {
      q: "Are these verified?",
      a: `A ${label} project with a checkmark is owner-verified — the owner proved they control the site. Any project can also connect Google Search Console to earn a verified, ranked spot on the momentum board.`,
    },
    {
      q: `How do I get my ${label} tool listed?`,
      a: "List it free in under a minute — no account needed. Add a description, pick the category, and you get a permanent link.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Best ${label} tools & indie projects`,
    numberOfItems: listed.length,
    itemListElement: listed.slice(0, 50).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteConfig.url}/listed/${l.host}`,
      name: l.displayName,
    })),
  };

  return (
    <div className="container max-w-4xl py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-3xl">
        <h1 className="text-balance text-4xl font-bold tracking-tight">Best {label} tools &amp; indie projects</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A curated, growing directory of {label} tools — every one real, reachable, and listed on{" "}
          {siteConfig.name}. Unlike most &quot;best tools&quot; lists, nothing here is a paid placement or a
          third-party estimate: projects are listed free and earn a{" "}
          <BadgeCheck className="inline-block size-4 align-[-0.2em] text-primary" /> by proving ownership,
          then a ranked spot by connecting Google Search Console.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-medium">
            {listed.length} {listed.length === 1 ? "project" : "projects"}
          </span>
          {verifiedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-medium text-primary">
              <BadgeCheck className="size-3.5" /> {verifiedCount} verified
            </span>
          )}
          <Link href={`/best/fastest-growing/${category}`} className="text-primary hover:underline">
            See the fastest-growing {label} sites →
          </Link>
        </div>
      </div>

      {listed.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-lg font-medium">No {label} projects listed yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Be the first — list your {label} tool free and grab a permanent link.
          </p>
          <Button asChild className="mt-5">
            <Link href="/submit"><Plus className="size-4" /> List your project — free</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listed.map((l, i) => (
            <ListingCard key={l.host} listing={l} visits={visits.get(l.host) ?? 0} priority={i < 3} />
          ))}
        </ul>
      )}

      <section className="mt-12 max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
        <dl className="mt-4 space-y-6">
          {faq.map((f) => (
            <div key={f.q}>
              <dt className="font-medium text-foreground">{f.q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/submit"><Plus className="size-4" /> List your {label} tool — free</Link>
        </Button>
        <Link href={`/category/${category}`} className="text-sm font-medium text-primary hover:underline">
          See the verified {label} momentum board →
        </Link>
      </div>
    </div>
  );
}
