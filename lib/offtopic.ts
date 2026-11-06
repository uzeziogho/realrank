/**
 * Fit signals for the directory — not nationality.
 *
 * RealRank ranks by verified Google Search Console momentum and its audience
 * reads English. A listing written in Chinese, or on a .cn domain, targets the
 * Baidu / mainland-China market the product can't rank and the audience can't
 * read — so it doesn't fit, wherever its author happens to be. Crucially, a
 * Chinese founder building a global product writes an English listing on a .com
 * and sails straight through: we gate on the listing's content, not on where the
 * request came from.
 */

/** Han ideograph ranges — "Chinese characters". Deliberately not fullwidth
 *  punctuation or symbols, which would inflate the count on otherwise-Latin text. */
function isHan(cp: number): boolean {
  return (
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Extension A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified Ideographs
    (cp >= 0xf900 && cp <= 0xfaff) // CJK Compatibility Ideographs
  );
}

/**
 * True when text is predominantly Chinese characters. Requires a few Han chars
 * (so a stray character in an English listing doesn't trip it) AND that they are
 * at least as common as Latin letters (so "AICost 中文" stays, "文件转换工具" goes).
 */
export function isPredominantlyChinese(text: string): boolean {
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

/** A .cn registrable domain (.cn, .com.cn, .net.cn, …) — targets the China market. */
export function isChinaTld(host: string): boolean {
  return /\.cn$/i.test(host.trim());
}

/**
 * Whether a submission doesn't fit the directory on content grounds. Combines the
 * two fit signals above over the host and the listing's own words. Returns a
 * reason for logging/triage, or null when the listing fits.
 */
export function offTopicReason(input: {
  host?: string | null;
  displayName?: string | null;
  tagline?: string | null;
  description?: string | null;
}): "china_tld" | "chinese_content" | null {
  if (input.host && isChinaTld(input.host)) return "china_tld";
  const text = [input.displayName, input.tagline, input.description].filter(Boolean).join(" ");
  if (isPredominantlyChinese(text)) return "chinese_content";
  return null;
}
