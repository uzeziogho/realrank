#!/usr/bin/env node
/**
 * Soft-delete directory listings that don't fit on content grounds.
 *
 *   node scripts/remove-offtopic-listings.mjs            # DRY RUN — prints matches
 *   node scripts/remove-offtopic-listings.mjs --apply    # actually deactivates them
 *
 * Flags active listings whose host is a .cn domain or whose text (name/tagline/
 * description) is predominantly Chinese characters — the same fit signal the
 * /api/list gate now uses. This gates on content, not nationality: a Chinese
 * founder's English listing for a global product is left alone. "Removal" is a
 * soft delete (is_active=false), matching how the app hides listings everywhere,
 * and it's reversible.
 *
 * Needs .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * (the service role is required to update rows). No network/geo API needed.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

// Keep this in sync with lib/offtopic.ts (duplicated here so the script needs no build step).
function isHan(cp) {
  return (
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfaff)
  );
}
function isPredominantlyChinese(text) {
  let han = 0;
  let latin = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (isHan(cp)) han += 1;
    else if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122)) latin += 1;
  }
  return han >= 4 && han >= latin;
}
function reasonFor(row) {
  if (/\.cn$/i.test((row.host || "").trim())) return "china_tld";
  const text = [row.display_name, row.tagline, row.description].filter(Boolean).join(" ");
  if (isPredominantlyChinese(text)) return "chinese_content";
  return null;
}

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      if (!(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* rely on the real environment */
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

console.log(`→ ${APPLY ? "APPLY" : "DRY RUN"} · off-topic fit signals (.cn domain, predominantly-Chinese text)`);
console.log(`→ ${url}\n`);

const { data: rows, error } = await supabase
  .from("listed_sites")
  .select("host, display_name, tagline, description")
  .eq("is_active", true)
  .order("created_at", { ascending: true });

if (error) {
  console.error("✗ Read failed:", error.message);
  process.exit(1);
}

const matches = [];
for (const row of rows ?? []) {
  const reason = reasonFor(row);
  if (reason) {
    matches.push(row);
    console.log(`  ⚑ ${reason.padEnd(16)} ${row.host.padEnd(28)} ${row.display_name}`);
  }
}

console.log(`\nScanned ${rows?.length ?? 0} active listings · ${matches.length} off-topic.`);

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
