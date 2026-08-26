import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/lib/articles";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Blog — organic search, leaderboards & the .lol wave",
  description:
    "Essays on verified organic traffic, the .lol pay-to-rank craze (outbid.lol), verified-data directories (TrustMRR), and how RealRank ranks sites by real growth.",
  alternates: { canonical: "/blog" },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogIndex() {
  const posts = [...articles].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="container max-w-3xl py-16">
      <h1 className="text-4xl font-bold tracking-tight">The {siteConfig.name} blog</h1>
      <p className="mt-3 text-muted-foreground">
        Verified organic traffic, the .lol leaderboard wave, and what actually
        moves rankings.
      </p>

      <div className="mt-10 divide-y divide-border border-t border-border">
        {posts.map((post) => (
          <article key={post.slug} className="py-6">
            <p className="text-xs text-muted-foreground">{fmt(post.date)}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">
              <Link href={`/blog/${post.slug}`} className="hover:text-primary">
                {post.title}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{post.description}</p>
            <Link
              href={`/blog/${post.slug}`}
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Read →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
