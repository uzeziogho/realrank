import "server-only";

/**
 * Domain Rating (0–100) via AnyAPI's Ahrefs Domain Overview. This replaces the
 * old Open PageRank (0–10) source so the board's DR reads on the familiar
 * Ahrefs scale. Used as a clearly-labeled third-party estimate on the board,
 * never as a ranking factor.
 *
 * Requires ANYAPI_KEY (a getanyapi.com key, billed per request — ~$0.005 each).
 * ANYAPI_BASE_URL overrides the gateway host if needed. When the key is unset
 * every call returns an empty map, so the feature is simply absent — nothing
 * breaks. The endpoint is one-domain-per-request and slow (median ~12s), so
 * callers refresh only a small, stale/missing batch per run — see the cron.
 */
const DEFAULT_BASE = "https://api.getanyapi.com";
const SKU_PATH = "/v1/run/ahrefs.overview";
/** How many domains to fetch at once — the API is slow, so keep this modest. */
const CONCURRENCY = 5;

interface AhrefsOverview {
  found?: boolean;
  data?: { items?: { domain?: string; domainRating?: number }[] } | null;
}

/**
 * Fetch Ahrefs Domain Rating (0–100) for the given bare hosts (e.g.
 * "example.com"). Returns a Map keyed by the input host; missing/errored hosts
 * are simply absent. Never throws. Values are clamped to 0–100 and rounded to
 * a whole number (Ahrefs DR is an integer-scale metric).
 */
export async function fetchDomainRatings(domains: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const key = process.env.ANYAPI_KEY?.trim();
  if (!key || domains.length === 0) return out;

  const base = (process.env.ANYAPI_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/+$/, "");
  const endpoint = `${base}${SKU_PATH}`;
  const unique = Array.from(new Set(domains.filter(Boolean)));

  async function one(domain: string): Promise<void> {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ url: domain, mode: "subdomains" }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) return;
      const json = (await res.json()) as AhrefsOverview;
      if (json.found === false) return;
      const rating = json.data?.items?.[0]?.domainRating;
      if (rating != null && Number.isFinite(rating)) {
        out.set(domain, Math.max(0, Math.min(100, Math.round(rating))));
      }
    } catch {
      // Skip this domain; its previously stored value stands.
    }
  }

  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    await Promise.all(unique.slice(i, i + CONCURRENCY).map(one));
  }
  return out;
}
