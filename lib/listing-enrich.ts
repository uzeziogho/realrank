import "server-only";

import { askChoices, type ChoiceQuestion } from "@/lib/typesafe";
import { categories } from "@/lib/config";

/**
 * TypeSafe/Jev listing enrichment — two "select, don't generate" judgments over
 * a submitted listing, following the TypeSafe pattern: candidates live in code,
 * the model selects the intended one (or none), and code owns the policy
 * (confidence thresholds + "leave it blank" fallback).
 *
 *   1. Category    — Choice over the fixed category set.
 *   2. AlternativeTo — Choice over a curated set of well-known tools.
 *
 * Both only fill a field the submitter left blank, and only when the judgment
 * clears a confidence bar; otherwise the field stays null/unset. With no
 * TYPESAFE_API_KEY this is a no-op (askChoices returns empty), so listings work
 * exactly as before until it's configured.
 */

/**
 * Candidate tools for "alternative to" matching. A Choice can only pick a value
 * that's present here, so extend this list as the directory grows (or later
 * retrieve candidates dynamically). Kept broad but well-known on purpose.
 */
const ALT_TARGETS = [
  "Notion", "Airtable", "Figma", "Canva", "Framer", "Webflow", "Carrd", "Linktree",
  "Calendly", "Cal.com", "Typeform", "Google Forms", "Mailchimp", "ConvertKit",
  "Substack", "beehiiv", "Loom", "Zapier", "Make", "Stripe", "Gumroad", "Lemon Squeezy",
  "Slack", "Discord", "Trello", "Asana", "Linear", "Jira", "Intercom", "HubSpot",
  "Salesforce", "Google Analytics", "Plausible", "Ahrefs", "Semrush", "SimilarWeb",
  "Vercel", "Netlify", "Supabase", "Firebase", "GitHub", "Zendesk", "Buffer", "Hootsuite",
];

/** Tune on real data: how concentrated the judgment must be before we write it. */
const CATEGORY_MIN_CONFIDENCE = 0.6;
const ALT_MIN_CONFIDENCE = 0.72;

export interface ListingEnrichInput {
  displayName: string;
  tagline: string | null;
  description: string | null;
}

export interface ListingEnrichment {
  /** A valid category slug, only when confidently inferred. */
  category?: string;
  /** A well-known tool name, only when confidently inferred. */
  alternativeTo?: string;
}

const VALID_CATEGORY_SLUGS = new Set<string>(categories.map((c) => c.slug));

/**
 * Infer the fields asked for (needCategory / needAlternativeTo) with one
 * parallel TypeSafe request. Returns only the fields that cleared their
 * confidence bar; everything else is omitted. Never throws.
 */
export async function enrichListing(
  input: ListingEnrichInput,
  opts: { needCategory: boolean; needAlternativeTo: boolean },
): Promise<ListingEnrichment> {
  const questions: ChoiceQuestion[] = [];

  if (opts.needCategory) {
    questions.push({
      id: "category",
      instructions:
        "Which single category best describes this project, judging from its name, one-line tagline and description?",
      criteria: categories.map((c) => ({ value: c.slug, description: c.label })),
      allowNone: true,
    });
  }

  if (opts.needAlternativeTo) {
    questions.push({
      id: "alternativeTo",
      instructions:
        "If this project positions itself as a free, open-source, or indie alternative to ONE of the listed established tools, which tool is it an alternative to? Choose none unless it clearly aims to replace a specific tool on the list.",
      criteria: ALT_TARGETS.map((t) => ({ value: t })),
      allowNone: true,
    });
  }

  if (questions.length === 0) return {};

  const state = {
    project: {
      name: input.displayName,
      tagline: input.tagline ?? "",
      description: input.description ?? "",
    },
  };

  const answers = await askChoices(state, questions);
  const out: ListingEnrichment = {};

  const cat = answers.get("category");
  if (cat?.value && cat.confidence >= CATEGORY_MIN_CONFIDENCE && VALID_CATEGORY_SLUGS.has(cat.value)) {
    out.category = cat.value;
  }

  const alt = answers.get("alternativeTo");
  if (alt?.value && alt.confidence >= ALT_MIN_CONFIDENCE) {
    out.alternativeTo = alt.value;
  }

  return out;
}
