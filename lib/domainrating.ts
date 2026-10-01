import "server-only";

/**
 * Domain Rating (0–100). Two interchangeable sources, preferring a direct
 * Ahrefs API key when present and falling back to the AnyAPI gateway:
 *
 *   - AHREFS_API_KEY → Ahrefs API v3 (GET /v3/site-explorer/domain-rating).
 *     The official source; billed in Ahrefs API units.
 *   - ANYAPI_KEY     → AnyAPI's Ahrefs Domain Overview (POST /v1/run/...).
 *     The gateway fallback; billed per request (~$0.005 each).
 *
 * DR is a clearly-labeled third-party estimate on the board, never a ranking
 * factor. When neither key is set every call returns an empty map, so the
 * feature is simply absent — nothing breaks. Both endpoints are one-domain-
 * per-request and slow, so callers refresh only a small stale/missing batch per
 * run — see the cron.
 */
const AHREFS_BASE = "https://api.ahrefs.com";
const AHREFS_PATH = "/v3/site-explorer/domain-rating";
const ANYAPI_DEFAULT_BASE = "https://api.getanyapi.com";
const ANYAPI_SKU_PATH = "/v1/run/ahrefs.overview";
/** How many domains to fetch at once — the APIs are slow, so keep this modest. */
const CONCURRENCY = 5;
const REQUEST_TIMEOUT_MS = 45_000;

/** Ahrefs API v3 domain-rating response. */
interface AhrefsDomainRating {
  domain_rating?: { domain_rating?: number | null; ahrefs_rank?: number | null } | null;
}

/** AnyAPI Ahrefs Domain Overview response. */
interface AnyApiOverview {
  found?: boolean;
  data?: { items?: { domain?: string; domainRating?: number }[] } | null;
}

/**
 * Per-batch diagnostics, so a failed DR refresh is never silent. Callers can
 * pass one in and surface it (the cron includes it in its JSON response and
 * logs it), turning "DR is blank" into an answer: `source`/`keyConfigured`
 * say which provider ran (if any), `host` what it hit, and the counts show a
 * bad key as HTTP 401/403, a domain the source doesn't know as notFound, and a
 * working call as ok > 0.
 */
export interface DomainRatingDiag {
  source: "ahrefs" | "anyapi" | null;
  keyConfigured: boolean;
  host: string | null;
  attempted: number;
  ok: number;
  notFound: number;
  failed: number;
  sampleError?: string;
}

export function newDomainRatingDiag(): DomainRatingDiag {
  return { source: null, keyConfigured: false, host: null, attempted: 0, ok: 0, notFound: 0, failed: 0 };
}

function clampDr(rating: number): number {
  return Math.max(0, Math.min(100, Math.round(rating)));
}

/**
 * Fetch Domain Rating (0–100) for the given bare hosts (e.g. "example.com").
 * Returns a Map keyed by the input host; missing/errored hosts are simply
 * absent. Never throws. Pass `diag` to collect per-batch outcome counts.
 */
export async function fetchDomainRatings(
  domains: string[],
  diag?: DomainRatingDiag,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ahrefsKey = process.env.AHREFS_API_KEY?.trim();
  const anyApiKey = process.env.ANYAPI_KEY?.trim();

  const unique = Array.from(new Set(domains.filter(Boolean)));
  if (unique.length === 0) {
    if (diag) diag.keyConfigured = Boolean(ahrefsKey || anyApiKey);
    return out;
  }

  // Prefer the direct Ahrefs key; fall back to the AnyAPI gateway.
  const fetcher = ahrefsKey
    ? makeAhrefsFetcher(ahrefsKey, out, diag)
    : anyApiKey
      ? makeAnyApiFetcher(anyApiKey, out, diag)
      : null;

  if (diag) {
    diag.source = ahrefsKey ? "ahrefs" : anyApiKey ? "anyapi" : null;
    diag.keyConfigured = Boolean(fetcher);
    if (diag.source) diag.attempted = unique.length;
  }
  if (!fetcher) return out;

  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    await Promise.all(unique.slice(i, i + CONCURRENCY).map(fetcher));
  }
  return out;
}

function note(
  diag: DomainRatingDiag | undefined,
  kind: "ok" | "notFound" | "failed",
  err?: string,
): void {
  if (!diag) return;
  diag[kind] += 1;
  if (kind === "failed" && err && !diag.sampleError) diag.sampleError = err;
}

/** Ahrefs API v3: GET /v3/site-explorer/domain-rating?target=&date= */
function makeAhrefsFetcher(
  key: string,
  out: Map<string, number>,
  diag?: DomainRatingDiag,
): (domain: string) => Promise<void> {
  const host = "api.ahrefs.com";
  if (diag) diag.host = host;
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (latest available)

  return async (domain: string): Promise<void> => {
    try {
      const url = `${AHREFS_BASE}${AHREFS_PATH}?target=${encodeURIComponent(domain)}&date=${date}`;
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        const msg = `HTTP ${res.status} from ${host}`;
        console.error(`[dr] ${domain}: ${msg}`);
        note(diag, "failed", msg);
        return;
      }
      const json = (await res.json()) as AhrefsDomainRating;
      const rating = json.domain_rating?.domain_rating;
      if (rating != null && Number.isFinite(rating)) {
        out.set(domain, clampDr(rating));
        note(diag, "ok");
      } else {
        // Ahrefs returned a row but no rating — treat as "unknown domain".
        note(diag, "notFound");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[dr] ${domain}: ${msg}`);
      note(diag, "failed", msg);
    }
  };
}

/** AnyAPI gateway: POST /v1/run/ahrefs.overview {url, mode}. */
function makeAnyApiFetcher(
  key: string,
  out: Map<string, number>,
  diag?: DomainRatingDiag,
): (domain: string) => Promise<void> {
  const base = (process.env.ANYAPI_BASE_URL?.trim() || ANYAPI_DEFAULT_BASE).replace(/\/+$/, "");
  const endpoint = `${base}${ANYAPI_SKU_PATH}`;
  let host = base;
  try {
    host = new URL(endpoint).host;
  } catch {
    /* keep base */
  }
  if (diag) diag.host = host;

  return async (domain: string): Promise<void> => {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ url: domain, mode: "subdomains" }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        const msg = `HTTP ${res.status} from ${host}`;
        console.error(`[dr] ${domain}: ${msg}`);
        note(diag, "failed", msg);
        return;
      }
      const json = (await res.json()) as AnyApiOverview;
      if (json.found === false) {
        note(diag, "notFound");
        return;
      }
      const rating = json.data?.items?.[0]?.domainRating;
      if (rating != null && Number.isFinite(rating)) {
        out.set(domain, clampDr(rating));
        note(diag, "ok");
      } else {
        const msg = `no domainRating in response for ${domain}`;
        console.error(`[dr] ${msg}`);
        note(diag, "failed", msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[dr] ${domain}: ${msg}`);
      note(diag, "failed", msg);
    }
  };
}
