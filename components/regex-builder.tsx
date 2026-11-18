"use client";

import { useMemo, useState } from "react";
import { Check, Copy, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";
import { COMMERCIAL_WORDS, QUESTION_WORDS, RE2_MAX } from "@/lib/gsc-regex";

/**
 * Build a Google Search Console regex filter from plain choices, test it on
 * sample queries, copy it. Search Console uses RE2 syntax (no lookaheads, no
 * backreferences, 4,096-character limit); everything generated here stays
 * within that, and the live tester runs the same pattern in the browser.
 */


type Recipe = {
  id: string;
  label: string;
  blurb: string;
  field: "Query" | "Page";
  input: "terms" | "number" | "none";
  inputLabel?: string;
  placeholder?: string;
  defaultTerms?: string;
  defaultNumber?: number;
  /** Search Console's two regex options, with what each one shows. */
  matches: string;
  doesntMatch: string;
  samples: string;
  build: (terms: string[], n: number) => { regex: string; warning?: string };
};

/** Escape RE2 metacharacters in a literal term. */
function esc(s: string): string {
  return s.replace(/[\\.+*?()|[\]{}^$]/g, "\\$&");
}

/** Lowercase, trim, de-duplicate a comma/newline separated list. */
function parseTerms(raw: string): string[] {
  return [...new Set(raw.split(/[\n,]/).map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}


const RECIPES: Recipe[] = [
  {
    id: "brand",
    label: "Brand vs non-brand",
    blurb: "Split searches for your name from everything else — the clearest view of real SEO growth.",
    field: "Query",
    input: "terms",
    inputLabel: "Your brand names and common misspellings",
    placeholder: "realrank, real rank, realrank.lol",
    defaultTerms: "real rank, realrnk",
    matches: "Only brand searches",
    doesntMatch: "Only non-brand searches",
    samples: "realrank leaderboard\nreal rank lol\nfastest growing websites\nhow to check website traffic\nrealrnk",
    build: (terms) => ({
      // A space in a term also matches it written as one word ("real rank" ↔ "realrank").
      regex: terms.map((t) => esc(t).replace(/\s+/g, " ?")).join("|"),
    }),
  },
  {
    id: "questions",
    label: "Question searches",
    blurb: "Queries phrased as questions — ideal for FAQ sections, guides and featured snippets.",
    field: "Query",
    input: "terms",
    inputLabel: "Question words (edit freely)",
    defaultTerms: QUESTION_WORDS.join(", "),
    matches: "Only questions",
    doesntMatch: "Everything except questions",
    samples: "how to grow organic traffic\nwhat is a good ctr\norganic traffic checker\nis similarweb accurate\nbest seo tools",
    build: (terms) => ({ regex: `^(?:${terms.map(esc).join("|")})\\b` }),
  },
  {
    id: "commercial",
    label: "Buying-intent searches",
    blurb: "Comparison and pricing searches — the queries closest to a signup or sale.",
    field: "Query",
    input: "terms",
    inputLabel: "Intent words (edit freely)",
    defaultTerms: COMMERCIAL_WORDS.join(", "),
    matches: "Only buying-intent searches",
    doesntMatch: "Everything else",
    samples: "best website traffic checker\nsimilarweb alternative\nahrefs vs semrush\nwhat is organic traffic\nseo tool pricing",
    build: (terms) => ({ regex: `\\b(?:${terms.map(esc).join("|")})\\b` }),
  },
  {
    id: "any",
    label: "Contains any of these words",
    blurb: "Group a topic: every query mentioning at least one of your words.",
    field: "Query",
    input: "terms",
    inputLabel: "Words or phrases",
    placeholder: "traffic, clicks, visitors",
    defaultTerms: "traffic, clicks, visitors",
    matches: "Queries with any of the words",
    doesntMatch: "Queries with none of them",
    samples: "website traffic checker\nhow many clicks is good\nseo leaderboard\nunique visitors meaning",
    build: (terms) => ({ regex: `\\b(?:${terms.map((t) => esc(t).replace(/\s+/g, "\\s+")).join("|")})\\b` }),
  },
  {
    id: "all",
    label: "Contains all of these words",
    blurb: "Queries that mention every word, in any order. RE2 has no lookaheads, so this lists each order — best for 2–4 words.",
    field: "Query",
    input: "terms",
    inputLabel: "Words (2–4 work best)",
    placeholder: "seo, traffic",
    defaultTerms: "seo, traffic",
    matches: "Queries with every word",
    doesntMatch: "Queries missing at least one",
    samples: "seo traffic checker\ntraffic from seo\nseo tools\nfree traffic",
    build: (terms) => {
      if (terms.length > 5) return { regex: "", warning: "Use 5 words or fewer — every extra word multiplies the pattern's length." };
      const perms = permutations(terms.map(esc));
      return {
        regex: perms.length === 1 ? perms[0][0] ?? "" : `^(?:${perms.map((p) => `.*${p.join(".*")}`).join("|")})`,
        warning: terms.length === 5 ? "5 words make 120 combinations — check it's under the length limit." : undefined,
      };
    },
  },
  {
    id: "longtail",
    label: "Long-tail searches",
    blurb: "Queries with many words: specific intent, usually easier to rank for, great content ideas.",
    field: "Query",
    input: "number",
    inputLabel: "Minimum words",
    defaultNumber: 5,
    matches: "Queries with at least that many words",
    doesntMatch: "Shorter queries",
    samples: "how to check if website traffic is real\nseo tools\nbest free tool to see competitor organic traffic\nrealrank",
    build: (_t, n) => ({ regex: `^(?:\\S+\\s+){${Math.max(1, n - 1)},}\\S+$` }),
  },
  {
    id: "short",
    label: "Short head terms",
    blurb: "One- to three-word queries: the broad, high-volume terms.",
    field: "Query",
    input: "number",
    inputLabel: "Maximum words",
    defaultNumber: 3,
    matches: "Queries with at most that many words",
    doesntMatch: "Longer queries",
    samples: "seo\nwebsite traffic\nfastest growing websites\nhow to grow organic traffic fast",
    build: (_t, n) => ({ regex: n <= 1 ? "^\\S+$" : `^\\S+(?:\\s+\\S+){0,${n - 1}}$` }),
  },
  {
    id: "folders",
    label: "Pages in certain folders",
    blurb: "Filter the Pages report to sections of your site, like /blog/ or /docs/.",
    field: "Page",
    input: "terms",
    inputLabel: "Folders",
    placeholder: "blog, guides",
    defaultTerms: "blog, guides",
    matches: "Only pages in those folders",
    doesntMatch: "Every page outside them",
    samples: "https://example.com/blog/seo-tips\nhttps://example.com/pricing\nhttps://example.com/guides/start\nhttps://example.com/blogroll",
    build: (terms) => ({ regex: `/(?:${terms.map((t) => esc(t.replace(/^\/+|\/+$/g, ""))).join("|")})/` }),
  },
  {
    id: "params",
    label: "URLs with parameters",
    blurb: "Find indexed URLs carrying ?query strings — often duplicates worth canonicalising.",
    field: "Page",
    input: "none",
    matches: "Only URLs with a ? parameter",
    doesntMatch: "Only clean URLs",
    samples: "https://example.com/shoes?color=red\nhttps://example.com/shoes\nhttps://example.com/?ref=x",
    build: () => ({ regex: "\\?" }),
  },
];

export function RegexBuilder() {
  const [recipeId, setRecipeId] = useState(RECIPES[0].id);
  const recipe = RECIPES.find((r) => r.id === recipeId)!;
  const [termsBy, setTermsBy] = useState<Record<string, string>>({});
  const [numBy, setNumBy] = useState<Record<string, number>>({});
  const [samplesBy, setSamplesBy] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const termsRaw = termsBy[recipe.id] ?? recipe.defaultTerms ?? "";
  const n = numBy[recipe.id] ?? recipe.defaultNumber ?? 3;
  const samples = samplesBy[recipe.id] ?? recipe.samples;
  const terms = parseTerms(termsRaw);

  const { regex, warning } = useMemo(
    () => (recipe.input === "terms" && terms.length === 0 ? { regex: "", warning: undefined } : recipe.build(terms, n)),
    [recipe, termsRaw, n],
  );

  const tooLong = regex.length > RE2_MAX;
  const tester = useMemo(() => {
    if (!regex) return null;
    try {
      return new RegExp(regex);
    } catch {
      return null;
    }
  }, [regex]);
  const lines = samples.split("\n").map((l) => l.trim()).filter(Boolean);

  async function copy() {
    if (!regex) return;
    try {
      await navigator.clipboard.writeText(regex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the field is selectable */
    }
    track("regex_copy", recipe.id);
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-medium">1. What do you want to filter?</p>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Filter recipe">
          {RECIPES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={r.id === recipeId}
              onClick={() => {
                setRecipeId(r.id);
                setCopied(false);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                r.id === recipeId
                  ? "border-primary bg-primary/10 font-medium text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{recipe.blurb}</p>
      </div>

      {recipe.input !== "none" && (
        <div>
          <label htmlFor="rx-input" className="text-sm font-medium">
            2. {recipe.inputLabel}
          </label>
          {recipe.input === "terms" ? (
            <>
              <textarea
                id="rx-input"
                rows={2}
                value={termsRaw}
                placeholder={recipe.placeholder}
                onChange={(e) => setTermsBy((s) => ({ ...s, [recipe.id]: e.target.value }))}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">Separate with commas or new lines.</p>
            </>
          ) : (
            <input
              id="rx-input"
              type="number"
              min={1}
              max={12}
              value={n}
              onChange={(e) => setNumBy((s) => ({ ...s, [recipe.id]: Math.min(12, Math.max(1, Number(e.target.value) || 1)) }))}
              className="mt-2 block h-10 w-24 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          )}
        </div>
      )}

      <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Your regex</p>
          <span className={cn("text-xs tabular-nums", tooLong ? "font-semibold text-danger" : "text-muted-foreground")}>
            {regex.length.toLocaleString()} / {RE2_MAX.toLocaleString()} characters
          </span>
        </div>
        <div className="mt-2 flex items-stretch gap-2">
          <code
            className="min-h-10 flex-1 select-all break-all rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm"
            aria-live="polite"
          >
            {regex || <span className="text-muted-foreground">Add at least one word above</span>}
          </code>
          <button
            type="button"
            onClick={copy}
            disabled={!regex}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {(warning || tooLong) && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-danger">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {tooLong ? "Search Console rejects patterns over 4,096 characters — remove some words." : warning}
          </p>
        )}
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>
            Search Console → <span className="text-foreground">Performance</span> → <span className="text-foreground">+ Add filter</span> →{" "}
            <span className="text-foreground">{recipe.field}</span>
          </li>
          <li>
            Choose <span className="text-foreground">Custom (regex)</span>, then{" "}
            <span className="text-foreground">Matches regex</span> ({recipe.matches.toLowerCase()}) or{" "}
            <span className="text-foreground">Doesn&apos;t match regex</span> ({recipe.doesntMatch.toLowerCase()})
          </li>
          <li>Paste and apply</li>
        </ol>
      </div>

      <div>
        <label htmlFor="rx-samples" className="text-sm font-medium">
          3. Test it — one {recipe.field === "Page" ? "URL" : "query"} per line
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <textarea
            id="rx-samples"
            rows={6}
            value={samples}
            onChange={(e) => setSamplesBy((s) => ({ ...s, [recipe.id]: e.target.value }))}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <ul className="space-y-1 rounded-lg border border-border bg-card p-3 text-xs" aria-label="Test results">
            {lines.map((l, i) => {
              const hit = tester ? tester.test(recipe.field === "Query" ? l.toLowerCase() : l) : false;
              return (
                <li key={i} className="flex items-start gap-1.5">
                  {hit ? (
                    <CheckCircle2 className="mt-px size-3.5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="mt-px size-3.5 shrink-0 text-muted-foreground/60" />
                  )}
                  <span className={cn("break-all font-mono", hit ? "text-foreground" : "text-muted-foreground")}>{l}</span>
                </li>
              );
            })}
            {lines.length === 0 && <li className="text-muted-foreground">Type some examples on the left.</li>}
          </ul>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          <CheckCircle2 className="inline size-3 text-success" /> = shown with &quot;Matches regex&quot;. Search Console
          lowercases queries, so we do too.
        </p>
      </div>
    </div>
  );
}
