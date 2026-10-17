import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/server";
import { classifyTraffic } from "@/lib/bot";
import { getListedHosts } from "@/lib/listed";
import { hostname } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-host outbound click counter, called from VisitLink on click.
 *
 * This used to be a side effect of the /visit/<host> redirect, but a redirect
 * hop on an outbound link reads as cloaking to SEO crawlers (and got
 * /visit/<host> flagged as a 302 + spam), so the board now links straight at
 * the destination and reports the click here instead. The host is resolved
 * against an ACTIVE published site before it is counted, so arbitrary input
 * can't write rows. Aggregate counts only (site_outbound_clicks); no PII.
 * Always 204 — analytics must never break a click.
 */
export async function POST(req: Request) {
  const res = new NextResponse(null, { status: 204 });
  try {
    const h = await headers();
    // Same bot definition as the other beacons (lib/bot.ts). Automated clicks
    // are dropped rather than classified: site_outbound_clicks answers "how
    // many people visited this listed site", and has no bot dimension.
    if (classifyTraffic({ ua: h.get("user-agent") }).isBot) return res;

    let body: { host?: string } = {};
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return res;
    }
    const wanted = (body.host ?? "").trim().toLowerCase().replace(/^www\./, "").slice(0, 253);
    if (!wanted || !isSupabaseConfigured()) return res;

    const supabase = createServiceClient();
    // Only count hosts we actually carry, so the table can't be filled with
    // made-up hosts by anyone who finds this endpoint. Both tiers count: the
    // ranked board (published_sites) and the free directory (listed_sites) —
    // a listing's outbound clicks are the only value it can be shown.
    const { data: sites, error: sErr } = await supabase
      .from("published_sites")
      .select("site_url")
      .eq("is_active", true);
    if (sErr) throw sErr;
    let known = (sites ?? []).some(
      (s) => hostname(s.site_url).toLowerCase() === wanted,
    );
    if (!known) known = (await getListedHosts()).includes(wanted);
    if (!known) return res;

    const { error } = await supabase.rpc("bump_outbound_click", { p_host: wanted });
    if (error) throw error;
  } catch (err) {
    console.error("[visit] beacon failed:", err);
  }
  return res;
}
