import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { categories } from "@/lib/config";

/**
 * Claude-backed listing enrichment — two "select, don't generate" judgments over
 * a submitted listing:
 *
 *   1. Category      — pick one of the fixed category slugs (or none).
 *   2. AlternativeTo — pick one of a curated set of well-known tools (or none).
 *
 * Both only fill a field the submitter left blank, and only when Claude's own
 * confidence clears a bar; otherwise the field stays unset. Candidates live in
 * code and the model may only pick from them (enforced again here after the
 * call), so a listing can never get an invented category or tool.
 *
 * With no ANTHROPIC_API_KEY this is a complete no-op (returns {}), so listings
 * work exactly as before until it's configured. Any error degrades to the same
 * no-op — enrichment never blocks or breaks a submission.
 *
 * Model: defaults to Claude Opus; set ANTHROPIC_MODEL=claude-haiku-5-5 to run
 * this classification far cheaper. The request is deliberately tiny.
 */

const MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";
/** Keep the call from ever hanging the listing POST. */
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Candidate tools for "alternative to" matching. Claude may only pick a value
 * present here, so extend this list as the directory grows. Kept broad but
 * well-known on purpose.
 */
const ALT_TARGETS = [
  "Notion", "Airtable", "Figma", "Canva", "Framer", "Webflow", "Carrd", "Linktree",
  "Calendly", "Cal.com", "Typeform", "Google Forms", "Mailchimp", "ConvertKit",
  "Substack", "beehiiv", "Loom", "Zapier", "Make", "Stripe", "Gumroad", "Lemon Squeezy",
  "Slack", "Discord", "Trello", "Asana", "Linear", "Jira", "Intercom", "HubSpot",
  "Salesforce", "Google Analytics", "Plausible", "Ahrefs", "Semrush", "SimilarWeb",
  "Vercel", "Netlify", "Supabase", "Firebase", "GitHub", "Zendesk", "Buffer", "Hootsuite",
];

/** Tune on real data: how confident Claude must be before we write a field. */
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
const VALID_ALT_TARGETS = new Set<string>(ALT_TARGETS);

interface Judgment {
  category: string | null;
  categoryConfidence: number;
  alternativeTo: string | null;
  altConfidence: number;
}

/**
 * Infer the fields asked for (needCategory / needAlternativeTo) in one Claude
 * request. Returns only the fields that cleared their confidence bar; everything
 * else is omitted. Never throws.
 */
export async function enrichListing(
  input: ListingEnrichInput,
  opts: { needCategory: boolean; needAlternativeTo: boolean },
): Promise<ListingEnrichment> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return {};
  if (!opts.needCategory && !opts.needAlternativeTo) return {};

  const categoryOptions = categories.map((c) => `- ${c.slug}: ${c.label}`).join("\n");
  const altOptions = ALT_TARGETS.map((t) => `- ${t}`).join("\n");

  const system = [
    "You classify a software project for a public directory.",
    "You are given the project's name, one-line tagline, and description.",
    "Return ONLY a single minified JSON object, no prose, with these fields:",
    '{"category": <slug or null>, "categoryConfidence": <0..1>,',
    ' "alternativeTo": <tool name or null>, "altConfidence": <0..1>}',
    "",
    "Rules:",
    "- category MUST be exactly one of the slugs below, or null if none clearly fits.",
    opts.needCategory ? `Allowed categories (slug: meaning):\n${categoryOptions}` : "- Ignore category; return null for it.",
    "- alternativeTo MUST be exactly one of the tool names below, or null. Choose a tool ONLY if the project clearly positions itself as a free/open/indie alternative to that specific tool.",
    opts.needAlternativeTo ? `Allowed tools:\n${altOptions}` : "- Ignore alternativeTo; return null for it.",
    "- Confidence reflects how certain you are. Prefer null over a weak guess.",
  ].join("\n");

  const userText = [
    `Name: ${input.displayName}`,
    `Tagline: ${input.tagline ?? ""}`,
    `Description: ${input.description ?? ""}`,
  ].join("\n");

  try {
    const client = new Anthropic({ apiKey: key, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system,
      messages: [{ role: "user", content: userText }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    const parsed = JSON.parse(match[0]) as Partial<Judgment>;

    const out: ListingEnrichment = {};

    if (opts.needCategory) {
      const cat = typeof parsed.category === "string" ? parsed.category : null;
      const conf = typeof parsed.categoryConfidence === "number" ? parsed.categoryConfidence : 0;
      if (cat && conf >= CATEGORY_MIN_CONFIDENCE && VALID_CATEGORY_SLUGS.has(cat)) {
        out.category = cat;
      }
    }

    if (opts.needAlternativeTo) {
      const alt = typeof parsed.alternativeTo === "string" ? parsed.alternativeTo : null;
      const conf = typeof parsed.altConfidence === "number" ? parsed.altConfidence : 0;
      if (alt && conf >= ALT_MIN_CONFIDENCE && VALID_ALT_TARGETS.has(alt)) {
        out.alternativeTo = alt;
      }
    }

    return out;
  } catch (err) {
    console.error("[listing-enrich]", err instanceof Error ? err.message : String(err));
    return {};
  }
}
