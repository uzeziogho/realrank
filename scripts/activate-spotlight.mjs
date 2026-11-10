#!/usr/bin/env node
/**
 * Manually start (or extend) a listing's Spotlight — the fallback when a payment
 * didn't activate automatically (e.g. the webhook isn't set up yet).
 *
 *   npm run spotlight:activate -- <host> [days]     # default 7 days
 *
 * Mirrors activateSpotlight() in lib/listed.ts: owner-verified listings only;
 * a live run is extended from its current end date. Needs .env.local with
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* rely on the real environment */
  }
}
loadEnv();

const host = (process.argv[2] || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
const days = Number(process.argv[3] || 7);
if (!host || !Number.isFinite(days) || days <= 0) {
  console.error("Usage: npm run spotlight:activate -- <host> [days]");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: row, error } = await supabase
  .from("listed_sites")
  .select("host, owner_verified, spotlight_started_at, spotlight_until")
  .eq("host", host)
  .eq("is_active", true)
  .maybeSingle();
if (error) { console.error("✗ Read failed:", error.message); process.exit(1); }
if (!row) { console.error(`✗ No active listing for ${host}.`); process.exit(1); }
if (!row.owner_verified) { console.error(`✗ ${host} isn't owner-verified — Spotlight is for verified listings only.`); process.exit(1); }

const now = Date.now();
const end = row.spotlight_until ? Date.parse(row.spotlight_until) : 0;
const start = end > now && row.spotlight_started_at ? row.spotlight_started_at : new Date(now).toISOString();
const until = new Date(Math.max(now, end) + days * 86400000).toISOString();

const { error: updErr } = await supabase
  .from("listed_sites")
  .update({ spotlight_started_at: start, spotlight_until: until, spotlight_payment_id: `manual-${now}`, updated_at: new Date().toISOString() })
  .eq("host", host);
if (updErr) { console.error("✗ Update failed:", updErr.message); process.exit(1); }
console.log(`✓ ${host} spotlighted until ${until}. (The directory refreshes within a few minutes.)`);
