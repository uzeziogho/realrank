import { NextResponse, type NextRequest } from "next/server";
import { getStaleVerifiedHosts, recheckBadge, type BadgeRecheck } from "@/lib/listed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Listings re-checked per run. Runs daily, so each verified listing is checked every few days. */
const BATCH = 24;
/** Parallel site fetches — polite to listed sites, fast enough for the time budget. */
const CONCURRENCY = 6;
/** Stop starting new checks after this, leaving headroom under maxDuration. */
const TIME_BUDGET_MS = 45_000;

/**
 * Daily badge re-check, stalest first. "Verified" should mean verified now, not
 * once: an owner who removes the RealRank badge loses the verified mark and the
 * followed link that came with it. Fail-safe — a site we can't reach keeps its
 * status and is retried later (see recheckBadge).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const hosts = await getStaleVerifiedHosts(BATCH);
  const tally: Record<BadgeRecheck, number> = { kept: 0, removed: 0, unreachable: 0, error: 0 };
  const removed: string[] = [];
  let next = 0;

  async function worker() {
    while (next < hosts.length && Date.now() - started < TIME_BUDGET_MS) {
      const host = hosts[next++];
      const result = await recheckBadge(host);
      tally[result] += 1;
      if (result === "removed") removed.push(host);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, hosts.length) }, worker));

  return NextResponse.json({ checked: Object.values(tally).reduce((a, b) => a + b, 0), ...tally, removed });
}
