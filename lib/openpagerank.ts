import "server-only";

/**
 * Open PageRank — a free, DR-like domain-authority score (0–10). Used as a
 * clearly-labeled third-party estimate on the board, never as a ranking factor.
 *
 * Requires OPEN_PAGERANK_API_KEY (free at https://www.domcop.com/openpagerank/).
 * When unset, every call returns an empty map so the feature is simply absent —
 * nothing breaks.
 */
const ENDPOINT = "https://openpagerank.com/api/v1.0/getPageRank";
const MAX_PER_REQUEST = 100; // API cap

interface OprRow {
  domain: string;
  status_code: number;
  page_rank_decimal: number | string | null;
}

/**
 * Fetch domain-authority scores for the given domains (bare registrable hosts,
 * e.g. "example.com"). Returns a Map keyed by the input domain. Missing/errored
 * domains are simply absent. Never throws.
 */
export async function fetchDomainRanks(domains: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const key = process.env.OPEN_PAGERANK_API_KEY?.trim();
  if (!key || domains.length === 0) return out;

  const unique = Array.from(new Set(domains.filter(Boolean)));

  for (let i = 0; i < unique.length; i += MAX_PER_REQUEST) {
    const batch = unique.slice(i, i + MAX_PER_REQUEST);
    const qs = batch.map((d) => `domains[]=${encodeURIComponent(d)}`).join("&");
    try {
      const res = await fetch(`${ENDPOINT}?${qs}`, {
        headers: { "API-OPR": key },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { response?: OprRow[] };
      for (const row of json.response ?? []) {
        if (row.status_code !== 200) continue;
        const val = typeof row.page_rank_decimal === "string"
          ? Number.parseFloat(row.page_rank_decimal)
          : row.page_rank_decimal;
        if (val != null && Number.isFinite(val) && val > 0) {
          out.set(row.domain, Math.round(val * 10) / 10);
        }
      }
    } catch {
      // Skip this batch; other batches (and existing stored values) stand.
    }
  }

  return out;
}
