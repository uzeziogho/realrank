import type { Metadata } from "next";
import Link from "next/link";
import { Regex } from "lucide-react";
import { RegexBuilder } from "@/components/regex-builder";
import { QUESTION_WORDS } from "@/lib/gsc-regex";
import { ConnectCTA } from "@/components/connect-cta";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Search Console regex builder — free, with examples",
  description:
    "Build Google Search Console regex filters without writing regex: brand vs non-brand, question queries, long-tail, buying intent, folders. Test on your own queries, then copy and paste.",
  alternates: { canonical: "/search-console-regex" },
  keywords: [
    "search console regex",
    "google search console regex",
    "gsc regex",
    "search console regex examples",
    "regex brand non-brand search console",
    "search console regex questions",
  ],
  openGraph: {
    title: "Search Console regex builder",
    description: "Brand vs non-brand, questions, long-tail and more — build, test and copy Search Console regex filters.",
    url: `${siteConfig.url}/search-console-regex`,
  },
};

/** The cheat sheet, rendered on the server so the examples are readable without JavaScript. */
const CHEAT_SHEET: { use: string; field: string; regex: string }[] = [
  { use: "Brand searches (your name + misspellings)", field: "Query", regex: "acme|acmee|acme ?app" },
  { use: "Questions", field: "Query", regex: `^(?:${QUESTION_WORDS.slice(0, 8).join("|")})\\b` },
  { use: "Comparisons and alternatives", field: "Query", regex: "\\b(?:vs|versus|alternative|alternatives|compare)\\b" },
  { use: "Long-tail: 5+ words", field: "Query", regex: "^(?:\\S+\\s+){4,}\\S+$" },
  { use: "Short head terms: 1–3 words", field: "Query", regex: "^\\S+(?:\\s+\\S+){0,2}$" },
  { use: "Contains both words, any order", field: "Query", regex: "^(?:.*seo.*traffic|.*traffic.*seo)" },
  { use: "Local intent", field: "Query", regex: "near me|nearby|open now" },
  { use: "Blog and guide pages", field: "Page", regex: "/(?:blog|guides)/" },
  { use: "URLs with parameters", field: "Page", regex: "\\?" },
  { use: "Case-insensitive page match", field: "Page", regex: "(?i)/Products/" },
];

const FAQ = [
  {
    q: "Does Google Search Console support regex?",
    a: "Yes. In the Performance report, add a Query or Page filter, choose Custom (regex), then pick Matches regex or Doesn't match regex and paste your pattern.",
  },
  {
    q: "Which regex syntax does Search Console use?",
    a: "Google's RE2 syntax. It supports alternation (a|b), groups, character classes, quantifiers like {4,} and anchors (^ and $), but not lookaheads, lookbehinds or backreferences. That's why an \"all of these words\" filter has to list every word order.",
  },
  {
    q: "Is there a length limit?",
    a: "Yes, 4,096 characters. The builder shows a live character count and warns you before you reach it.",
  },
  {
    q: "Is Search Console regex case-sensitive?",
    a: "Matching is case-sensitive, but Search Console stores queries in lowercase, so lowercase query patterns match as expected. For page URLs with capitals, start the pattern with (?i) to ignore case.",
  },
  {
    q: "How do I filter out branded searches?",
    a: "Put your brand name and its common misspellings in one pattern separated by |, then use Doesn't match regex. What's left is non-brand traffic — the part that SEO work actually grows.",
  },
];

export default function SearchConsoleRegexPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Search Console regex builder",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: `${siteConfig.url}/search-console-regex`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <div className="container max-w-3xl py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />

      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
        <Regex className="size-3.5 text-primary" /> Free tool · no login
      </span>
      <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Search Console regex builder</h1>
      <p className="mt-3 text-pretty text-muted-foreground">
        Google Search Console can filter queries and pages with regular expressions — if you can write them. Pick what you
        want to see, test it on your own examples, and copy a pattern that works first time.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card/40 p-4 sm:p-6">
        <RegexBuilder />
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">Search Console regex cheat sheet</h2>
        <p className="mt-2 text-sm text-muted-foreground">Copy these as they are, or swap in your own words.</p>
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">To see</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Filter</th>
                <th className="px-3 py-2 font-medium">Regex</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CHEAT_SHEET.map((r) => (
                <tr key={r.use}>
                  <td className="px-3 py-2 align-top">
                    {r.use}
                    <span className="block text-xs text-muted-foreground sm:hidden">{r.field} filter</span>
                  </td>
                  <td className="hidden px-3 py-2 align-top text-muted-foreground sm:table-cell">{r.field}</td>
                  <td className="px-3 py-2 align-top">
                    <code className="select-all break-all font-mono text-xs">{r.regex}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
        <dl className="mt-4 space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="font-medium">{f.q}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Is your non-brand traffic actually growing?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Search Console (read-only) and {siteConfig.name} tracks your organic momentum every day — and ranks it
          against other verified sites. Or{" "}
          <Link href="/rank-preview" className="text-primary hover:underline">preview your rank from an export</Link> first.
        </p>
        <ConnectCTA source="regex_tool" align="start" className="mt-4" />
      </section>
    </div>
  );
}
