import "server-only";

/**
 * Minimal TypeSafe (Jev / System One) adapter — the ONLY place that talks to the
 * TypeSafe HTTP API, so if the real contract differs this is the single file to
 * change (or swap for TypeSafe's official JS SDK).
 *
 * ⚠️ VERIFY THE WIRE FORMAT against https://docs.typesafe.ai (the API / SDK
 * pages). This payload shape is reconstructed from TypeSafe's documented
 * concepts — a `Choice` question has `instructions` (the judgment) and
 * `criteria` (the possible answers) evaluated over shared `state`; independent
 * questions run in parallel in one request; answers carry a confidence that
 * summarizes distribution concentration. Field/endpoint names may need
 * adjusting; the callers (lib/listing-enrich.ts) don't depend on them.
 *
 * Server-only. Keyed by TYPESAFE_API_KEY. When the key is unset OR anything
 * fails, every call returns an empty result so features degrade to a no-op —
 * nothing breaks when TypeSafe isn't configured.
 */

const DEFAULT_ENDPOINT = "https://api.typesafe.ai/v1/ask";
const REQUEST_TIMEOUT_MS = 8000;
/** Sentinel option so a Choice can answer "none of these" (see allowNone). */
const NONE = "__none__";

export interface ChoiceOption {
  value: string;
  description?: string;
}

export interface ChoiceQuestion {
  /** For code only — never sent to the model; put all meaning in instructions. */
  id: string;
  /** The judgment to make. */
  instructions: string;
  /** The possible answers (the model cannot choose an omitted value). */
  criteria: ChoiceOption[];
  /** Add a no-match outcome so "nothing fits" is representable. */
  allowNone?: boolean;
}

export interface ChoiceAnswer {
  /** The chosen option value, or null when none applied. */
  value: string | null;
  /** 0–1 concentration of the distribution (NOT correctness). */
  confidence: number;
}

/**
 * Ask one or more independent Choice questions over the same state, in parallel.
 * Returns a map of question id → answer. Missing/errored questions are absent.
 */
export async function askChoices(
  state: Record<string, unknown>,
  questions: ChoiceQuestion[],
): Promise<Map<string, ChoiceAnswer>> {
  const out = new Map<string, ChoiceAnswer>();
  const key = process.env.TYPESAFE_API_KEY?.trim();
  if (!key || questions.length === 0) return out;

  const endpoint = process.env.TYPESAFE_API_URL?.trim() || DEFAULT_ENDPOINT;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        state,
        questions: questions.map((q) => ({
          id: q.id,
          type: "choice",
          instructions: q.instructions,
          criteria: [
            ...q.criteria.map((c) => ({ value: c.value, description: c.description })),
            ...(q.allowNone ? [{ value: NONE, description: "None of these clearly applies." }] : []),
          ],
        })),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[typesafe] HTTP ${res.status}`);
      return out;
    }
    const json = (await res.json()) as {
      answers?: { id: string; value?: string | null; confidence?: number }[];
    };
    for (const a of json.answers ?? []) {
      if (!a?.id) continue;
      const value = !a.value || a.value === NONE ? null : a.value;
      out.set(a.id, { value, confidence: typeof a.confidence === "number" ? a.confidence : 0 });
    }
    return out;
  } catch (err) {
    console.error("[typesafe]", err instanceof Error ? err.message : String(err));
    return out;
  }
}
