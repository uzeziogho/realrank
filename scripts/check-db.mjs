#!/usr/bin/env node
/**
 * Supabase connection check for OrganicRank.
 *
 *   npm run db:check
 *
 * Loads .env.local, connects with the service-role key, and verifies each
 * table exists and is queryable. Prints a clear pass/fail per table so you can
 * confirm the website is actually linked to your Supabase project.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Minimal .env.local loader (no dotenv dependency).
function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // No .env.local — rely on real environment variables.
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("✗ Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and a key in .env.local");
  process.exit(1);
}

console.log(`→ Connecting to ${url}`);
const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
  "profiles",
  "connected_accounts",
  "published_sites",
  "sponsored_slots",
];

let ok = true;
for (const table of tables) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    ok = false;
    console.error(`✗ ${table.padEnd(20)} ${error.message}`);
  } else {
    console.log(`✓ ${table.padEnd(20)} ${count ?? 0} rows`);
  }
}

console.log(
  ok
    ? "\n✓ Supabase is linked and all tables are present."
    : "\n✗ Some tables failed. Did you run supabase/schema.sql in this project?",
);
process.exit(ok ? 0 : 1);
