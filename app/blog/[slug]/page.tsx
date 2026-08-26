import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Prose } from "@/components/prose";
import { articles, getArticle } from "@/lib/articles";
import { siteConfig } from "@/lib/config";

export const revalidate = 3600;

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: `${siteConfig.url}/blog/${article.slug}`,
      publishedTime: article.date,
      modifiedTime: article.updated ?? article.date,
    },
  };
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPost({ params }: { params: Params }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const { Body } = article;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.updated ?? article.date,
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name },
    mainEntityOfPage: `${siteConfig.url}/blog/${article.slug}`,
    keywords: article.keywords.join(", "),
  };

  return (
    <article className="container max-w-3xl py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        All posts
      </Link>

      <p className="mt-6 text-sm text-muted-foreground">{fmt(article.date)}</p>
      <h1 className="mt-1 text-balance text-4xl font-bold tracking-tight">{article.title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{article.description}</p>

      <div className="mt-8 border-t border-border pt-8">
        <Prose>
          <Body />
        </Prose>
      </div>

      <div className="mt-12 rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-medium">Claim your verified rank</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Google Search Console and let real organic growth decide your order.
        </p>
        <Button asChild className="mt-4">
          <Link href="/login">Connect Search Console</Link>
        </Button>
      </div>
    </article>
  );
}
