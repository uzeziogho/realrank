/**
 * One definition of "bot" for every first-party beacon.
 *
 * The beacons used to drop suspected bots on the floor, which kept the public
 * counters honest but made the bot share unknowable — a dropped hit cannot be
 * reported on or re-filtered later. Classification instead keeps the hit,
 * labels why it was judged automated, and lets the read side decide.
 *
 * Scope, stated plainly: these are *self-disclosure* signals. They catch
 * crawlers that name themselves and automation that sets `navigator.webdriver`
 * (Playwright, Puppeteer, Selenium). They do NOT reproduce a behavioural
 * verdict like Microsoft Clarity's "suspicious interaction" / "suspicious
 * device", which is derived from interaction and fingerprint patterns across a
 * session. Matching that would mean persisting per-visitor signals, which is
 * exactly what the aggregate, no-PII beacon design rules out. So expect this to
 * report a smaller bot share than Clarity does, and treat the two as different
 * measurements rather than one number that ought to agree.
 */

/** Why a hit was classified as automated. `null` means it was not. */
export type BotReason = "user-agent" | "webdriver" | "no-user-agent";

export interface TrafficVerdict {
  isBot: boolean;
  /** Set only when isBot is true — the signal that decided it. */
  reason: BotReason | null;
}

/**
 * Self-identifying crawlers, preview fetchers, monitors, HTTP clients and
 * automation stacks. Matching is on the raw user-agent, case-insensitive.
 */
export const BOT_UA_RE =
  /bot|crawl|spider|slurp|bing|google|facebook|embedly|preview|monitor|curl|wget|headless|lighthouse|pingdom|uptime|screenshot|whatsapp|telegram|discord|slack|playwright|puppeteer|selenium|webdriver|phantomjs|python-requests|axios|node-fetch|http-client/i;

/**
 * Classify one hit. `webdriver` is the client's own `navigator.webdriver`,
 * forwarded by the beacon; it is a hint from an untrusted caller, so it can
 * only ever add a bot verdict, never clear one.
 */
export function classifyTraffic({
  ua,
  webdriver = false,
}: {
  ua: string | null | undefined;
  webdriver?: boolean;
}): TrafficVerdict {
  const agent = (ua ?? "").trim();

  // A real browser always sends a user-agent; an empty one is a scripted client.
  if (agent.length === 0) return { isBot: true, reason: "no-user-agent" };
  if (BOT_UA_RE.test(agent)) return { isBot: true, reason: "user-agent" };
  if (webdriver) return { isBot: true, reason: "webdriver" };

  return { isBot: false, reason: null };
}
