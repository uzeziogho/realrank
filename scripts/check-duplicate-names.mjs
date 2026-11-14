#!/usr/bin/env node
/**
 * List active directory listings whose names clash (same name ignoring case,
 * spacing, punctuation and a trailing domain ending) — with each other or with
 * a site on the verified board. Run before applying
 * supabase/migrations/20261114_unique_listing_names.sql, which only adds the
 * unique index once listing-vs-listing clashes are gone.
 *
 *   npm run db:dupe-names
 *
 * Read-only. Needs .env.local with NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY. The key function mirrors nameKey() in lib/listed.ts.
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

const nameKey = (name) =>
  name.normalize("NFKC").toLowerCase().trim().replace(/\.[a-z]{2,12}$/u, "").replace(/[^\p{L}\p{N}]+/gu, "");
const hostOf = (url) => {
  try {
    return new URL(url.startsWith("sc-domain:") ? `https://${url.slice(10)}` : url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url;
  }
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const [{ data: listed, error: e1 }, { data: board, error: e2 }] = await Promise.all([
  supabase.from("listed_sites").select("host, display_name, created_at, owner_verified").eq("is_active", true),
  supabase.from("published_sites").select("site_url, display_name").eq("is_active", true),
]);
if (e1 || e2) {
  console.error("✗ Read failed:", (e1 || e2).message);
  process.exit(1);
}

const groups = new Map();
for (const r of listed) {
  const k = nameKey(r.display_name);
  if (!k) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push({ where: "directory", host: r.host, name: r.display_name, since: r.created_at?.slice(0, 10), verified: r.owner_verified });
}
for (const r of board) {
  const k = nameKey(r.display_name);
  if (!groups.has(k)) continue; // only report board names that clash with a listing
  const host = hostOf(r.site_url);
  if (groups.get(k).some((x) => x.host === host)) continue; // the same site in both places is fine
  groups.get(k).push({ where: "board", host, name: r.display_name });
}

const clashes = [...groups.values()].filter((g) => new Set(g.map((x) => x.host)).size > 1);
if (clashes.length === 0) {
  console.log("✓ No duplicate names. Safe to apply 20261114_unique_listing_names.sql.");
  process.exit(0);
}
console.log(`✗ ${clashes.length} name clash${clashes.length === 1 ? "" : "es"} — keep the oldest (or the verified one), rename or deactivate the rest:\n`);
for (const g of clashes) {
  g.sort((a, b) => (a.since ?? "").localeCompare(b.since ?? ""));
  for (const x of g) {
    console.log(`  ${x.where.padEnd(9)} ${x.host.padEnd(36)} “${x.name}”${x.since ? `  listed ${x.since}` : ""}${x.verified ? "  ✓ verified" : ""}`);
  }
  console.log("");
}
console.log("The migration's index only covers listing-vs-listing clashes; board clashes are blocked for new listings by the app.");
process.exit(1);
