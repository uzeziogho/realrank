import "server-only";

import { getMovers } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { hostname, formatGrowth } from "@/lib/utils";

export interface MoversDigest {
  /** Post-ready text for X / LinkedIn (no markdown, links on their own line). */
  text: string;
  /** ISO of the refresh this digest reflects, if known. */
  weekOf: string | null;
  url: string;
  climbers: { rank: number; host: string; name: string; delta: number | null; growth: number }[];
  newcomers: { rank: number; host: string; name: string }[];
  /** True when there was nothing to report (a quiet week). */
  empty: boolean;
}

/**
 * Compose the week's Movers into a single shareable/auto-postable digest. Pure
 * read: builds from the same verified movers the /movers page shows, so the post
 * and the page never disagree. Safe to call from a cron route or a page.
 */
export async function buildMoversDigest(limit = 5): Promise<MoversDigest> {
  const movers = await getMovers(limit);
  const url = `${siteConfig.url}/movers`;

  const climbers = movers.climbers.map((s) => ({
    rank: s.rank,
    host: hostname(s.siteUrl),
    name: s.displayName,
    delta: s.rankDelta,
    growth: s.growthRate,
  }));
  const newcomers = movers.newcomers.map((s) => ({
    rank: s.rank,
    host: hostname(s.siteUrl),
    name: s.displayName,
  }));

  const empty = climbers.length === 0 && newcomers.length === 0;

  let text: string;
  if (empty) {
    text = `This week on ${siteConfig.name}: the board held steady. Rankings are verified from Google Search Console clicks, not estimates. See who's on top:\n${url}`;
  } else {
    const lines: string[] = [`This week's movers on ${siteConfig.name}`, ""];
    if (climbers.length > 0) {
      lines.push("Climbing:");
      climbers.forEach((c) => {
        const up = c.delta && c.delta > 0 ? ` (up ${c.delta})` : "";
        lines.push(`#${c.rank} ${c.host}${up} · ${formatGrowth(c.growth)} growth`);
      });
      lines.push("");
    }
    if (newcomers.length > 0) {
      lines.push("New on the board:");
      newcomers.forEach((n) => lines.push(`${n.host}`));
      lines.push("");
    }
    lines.push("Ranked by verified Google Search Console clicks, not estimates.");
    lines.push(url);
    text = lines.join("\n");
  }

  return { text, weekOf: movers.weekOf, url, climbers, newcomers, empty };
}
