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

/** Build the consent URL. `state` should be a CSRF token tied to the session. */
export function getAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline", // request a refresh token
    prompt: "consent", // force refresh_token on re-auth
    scope: [GSC_SCOPE],
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
