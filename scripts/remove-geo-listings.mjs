#!/usr/bin/env node
/**
 * Soft-delete directory listings submitted from blocked regions.
 *
 *   node scripts/remove-geo-listings.mjs            # DRY RUN — just prints matches
 *   node scripts/remove-geo-listings.mjs --apply    # actually deactivates them
 *
 * Reads every active row in listed_sites, geolocates its stored submitted_ip,
 * and flags the ones in CN / HK / MO / TW — the same set the /api/list gate now
 * blocks going forward. "Removal" is a soft delete (is_active = false), matching
 * how the app hides listings everywhere else: the board only shows active rows,
 * and it's reversible (flip is_active back to true).
 *
 * Needs .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * (the service role is required to update rows — RLS grants no client writes).
 *
 * Geolocation uses the free ipwho.is API (https, no key). Rows with no stored
 * submitted_ip can't be geolocated and are reported separately for manual review.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BLOCKED = new Set(["CN", "HK", "MO", "TW"]);
const APPLY = process.argv.includes("--apply");

// Minimal .env.local loader (no dotenv dependency) — same as check-db.mjs.
function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      const val = m[2].replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* no .env.local — rely on the real environment */
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role required to update rows).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Country code (ISO alpha-2) for an IP, or null on any failure. Fail-safe: a
 *  lookup that errors returns null, so we never deactivate on bad geo data. */
async function countryForIp(ip) {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.success === false || !data.country_code) return null;
    return String(data.country_code).toUpperCase();
  } catch {
    return null;
  }
}

console.log(`→ ${APPLY ? "APPLY" : "DRY RUN"} · blocking ${[...BLOCKED].join(", ")}`);
console.log(`→ ${url}\n`);

const { data: rows, error } = await supabase
  .from("listed_sites")
  .select("host, display_name, submitted_ip, created_at")
  .eq("is_active", true)
  .order("created_at", { ascending: true });

if (error) {
  console.error("✗ Read failed:", error.message);
  process.exit(1);
}

const matches = [];
let noIp = 0;
let scanned = 0;

for (const row of rows ?? []) {
  scanned += 1;
  if (!row.submitted_ip) {
    noIp += 1;
    continue;
  }
  const country = await countryForIp(row.submitted_ip);
  if (country && BLOCKED.has(country)) {
    matches.push({ ...row, country });
    console.log(`  ⚑ ${country}  ${row.host.padEnd(28)} ${row.display_name}`);
  }
  await sleep(250); // be gentle with the free geo API
}

console.log(`\nScanned ${scanned} active listings · ${matches.length} in blocked regions · ${noIp} with no stored IP (manual review).`);

if (matches.length === 0) {
  console.log("Nothing to remove.");
  process.exit(0);
}

if (!APPLY) {
  console.log("\nDry run — nothing changed. Re-run with --apply to soft-delete the flagged rows.");
  process.exit(0);
}

const hosts = matches.map((m) => m.host);
const { error: updErr } = await supabase
  .from("listed_sites")
  .update({ is_active: false, updated_at: new Date().toISOString() })
  .in("host", hosts);

if (updErr) {
  console.error("\n✗ Update failed:", updErr.message);
  process.exit(1);
}
console.log(`\n✓ Deactivated ${hosts.length} listing(s). Reverse with: update listed_sites set is_active=true where host in (…).`);
process.exit(0);
