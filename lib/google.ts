import "server-only";

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { requireEnv } from "@/lib/supabase/env";
import { computeMomentum } from "@/lib/momentum";

/**
 * Google Search Console helpers.
 *
 * Scope: https://www.googleapis.com/auth/webmasters.readonly (read-only).
 * Refresh tokens are stored encrypted (see lib/crypto.ts) and only ever
 * hydrated into an OAuth client on the server, right before an API call.
 */
export const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_REDIRECT_URI"),
  );
}

/**
 * Build the consent URL. `state` should be a CSRF token tied to the session.
 * We request identity scopes (openid/email/profile) alongside the GSC scope so
 * a single Google consent both signs the user in AND connects Search Console.
 */
export function getAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // request a refresh token
    prompt: "consent", // force refresh_token on re-auth
    scope: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      GSC_SCOPE,
    ],
    include_granted_scopes: true,
    state,
  });
}

/** Exchange an authorization code for tokens (includes refresh_token first time). */
export async function exchangeCode(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/** Hydrate an OAuth client from a (decrypted) refresh token. */
export function clientFromRefreshToken(refreshToken: string): OAuth2Client {
  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/** List the verified GSC properties the connected account can access. */
export async function listProperties(client: OAuth2Client): Promise<string[]> {
  const webmasters = google.webmasters({ version: "v3", auth: client });
  const res = await webmasters.sites.list();
  return (res.data.siteEntry ?? [])
    .filter((s) => s.permissionLevel && s.permissionLevel !== "siteUnverifiedUser")
    .map((s) => s.siteUrl!)
    .filter(Boolean);
}

/** Sum organic clicks for a site over the last `days` days (Search web results). */
export async function fetchClicks(
  client: OAuth2Client,
  siteUrl: string,
  days: number,
): Promise<number> {
  const webmasters = google.webmasters({ version: "v3", auth: client });
  const { startDate, endDate } = dateRange(days);

  const res = await webmasters.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: [], // aggregate total
      searchType: "web",
      dataState: "all",
      rowLimit: 1,
    },
  });

  return Math.round(res.data.rows?.[0]?.clicks ?? 0);
}

export interface DailyClicks {
  date: string; // YYYY-MM-DD
  clicks: number;
}

/**
 * Fetch per-day organic clicks for the last `days` days (Search web results),
 * using the `date` dimension. Powers the momentum timeline. Returns rows sorted
 * ascending by date; days Google has no data for are simply absent.
 */
export async function fetchDailyClicks(
  client: OAuth2Client,
  siteUrl: string,
  days: number,
): Promise<DailyClicks[]> {
  const webmasters = google.webmasters({ version: "v3", auth: client });
  const { startDate, endDate } = dateRange(days);

  const res = await webmasters.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["date"],
      searchType: "web",
      dataState: "all",
      rowLimit: days + 5,
    },
  });

  return (res.data.rows ?? [])
    .map((r) => ({
      date: String(r.keys?.[0] ?? ""),
      clicks: Math.round(r.clicks ?? 0),
    }))
    .filter((r) => r.date)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface SearchAnalyticsRow {
  /** The query text or page URL (depending on the requested dimension). */
  key: string;
  clicks: number;
  impressions: number;
  /** Click-through rate as a 0–1 ratio. */
  ctr: number;
  /** Average position in search results (1 = top). */
  position: number;
}

/**
 * Per-query (or per-page) Search Console metrics for a property over the last
 * `days` days — clicks, impressions, CTR and average position. Powers the
 * Search-leak analyzer. Returns rows sorted by impressions (desc).
 */
export async function fetchSearchAnalytics(
  client: OAuth2Client,
  siteUrl: string,
  opts: { dimension: "query" | "page"; days?: number; rowLimit?: number },
): Promise<SearchAnalyticsRow[]> {
  const { dimension, days = 28, rowLimit = 500 } = opts;
  const webmasters = google.webmasters({ version: "v3", auth: client });
  const { startDate, endDate } = dateRange(days);

  const res = await webmasters.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: [dimension],
      searchType: "web",
      dataState: "all",
      rowLimit,
    },
  });

  return (res.data.rows ?? [])
    .map((r) => ({
      key: String(r.keys?.[0] ?? ""),
      clicks: Math.round(r.clicks ?? 0),
      impressions: Math.round(r.impressions ?? 0),
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }))
    .filter((r) => r.key)
    .sort((a, b) => b.impressions - a.impressions);
}

export interface SiteMetrics {
  clicks_7d: number;
  clicks_28d: number;
  momentum_score: number;
  growth_rate: number;
}

/** Fetch both windows and compute the momentum score for a single property. */
export async function fetchSiteMetrics(
  client: OAuth2Client,
  siteUrl: string,
): Promise<SiteMetrics> {
  const [clicks_7d, clicks_28d] = await Promise.all([
    fetchClicks(client, siteUrl, 7),
    fetchClicks(client, siteUrl, 28),
  ]);
  const { momentumScore, growthRate } = computeMomentum({ clicks_7d, clicks_28d });
  return {
    clicks_7d,
    clicks_28d,
    momentum_score: momentumScore,
    growth_rate: growthRate,
  };
}

/**
 * GSC data lags ~2–3 days. End the window at 3 days ago so both the 7d and 28d
 * ranges contain settled data, keeping comparisons fair.
 */
function dateRange(days: number): { startDate: string; endDate: string } {
  const LAG_DAYS = 3;
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - LAG_DAYS);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { startDate: iso(start), endDate: iso(end) };
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
