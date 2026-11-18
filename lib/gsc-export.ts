import { computeMomentum } from "@/lib/momentum";

/**
 * Read a Google Search Console Performance export in the browser — the zip from
 * "Export → Download CSV", or the Chart.csv / Dates.csv inside it — and turn its
 * daily clicks into the same 7-day / 28-day numbers the live board uses. Nothing
 * here touches the network: the file never leaves the visitor's device.
 */

export interface DailyClicks {
  date: string; // YYYY-MM-DD
  clicks: number;
}

export interface ExportSummary {
  clicks7d: number;
  clicks28d: number;
  momentumScore: number;
  growthRate: number;
  /** Last day in the export (Search Console runs ~2–3 days behind). */
  lastDate: string;
  /** Calendar days the export covers (the 28-day window needs at least 28). */
  daysCovered: number;
}

const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Split one CSV line, honouring double quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/**
 * Daily clicks from the export's date table. Finds the Date and Clicks columns by
 * name (English and a few common translations), falling back to "first column a
 * date, second a number" for other languages.
 */
export function parseDailyClicksCsv(text: string): DailyClicks[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  let dateCol = header.findIndex((h) => /^(date|day|datum|fecha|data|date de|日付|日期)/.test(h));
  let clickCol = header.findIndex((h) => /^(clicks|klicks|clics|cliques|clic|クリック|点击)/.test(h));
  const firstRow = splitCsvLine(lines[1]);
  if (dateCol < 0 && DATE_RE.test(firstRow[0] ?? "")) dateCol = 0;
  if (clickCol < 0 && /^\d+$/.test((firstRow[1] ?? "").replace(/[,.\s]/g, ""))) clickCol = 1;
  if (dateCol < 0 || clickCol < 0) return [];

  const rows: DailyClicks[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const date = cells[dateCol];
    const clicks = Number((cells[clickCol] ?? "").replace(/[,\s]/g, ""));
    if (DATE_RE.test(date ?? "") && Number.isFinite(clicks) && clicks >= 0) rows.push({ date, clicks });
  }
  return rows;
}

/** Sum the same windows the board uses: the last 7 days and the last 28. */
export function summarize(rows: DailyClicks[]): ExportSummary | null {
  if (rows.length === 0) return null;
  const byDate = new Map(rows.map((r) => [r.date, r.clicks]));
  const times = rows.map((r) => Date.parse(`${r.date}T00:00:00Z`));
  const last = Math.max(...times);
  const first = Math.min(...times);
  const sum = (days: number) => {
    let s = 0;
    for (let i = 0; i < days; i++) s += byDate.get(new Date(last - i * DAY_MS).toISOString().slice(0, 10)) ?? 0;
    return s;
  };
  const clicks7d = sum(7);
  const clicks28d = sum(28);
  const { momentumScore, growthRate } = computeMomentum({ clicks_7d: clicks7d, clicks_28d: clicks28d });
  return {
    clicks7d,
    clicks28d,
    momentumScore,
    growthRate,
    lastDate: new Date(last).toISOString().slice(0, 10),
    daysCovered: Math.round((last - first) / DAY_MS) + 1,
  };
}

/**
 * Pull the daily-clicks CSV out of a Search Console export zip. A tiny reader
 * for the zip's central directory plus the browser's built-in "deflate-raw"
 * decompressor — no library. Returns null if there's no usable CSV inside.
 */
export async function csvFromZip(buf: ArrayBuffer): Promise<string | null> {
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65_557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;

  const count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const entries: { name: string; method: number; size: number; local: number }[] = [];
  for (let n = 0; n < count && off + 46 <= buf.byteLength; n++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const nameLen = dv.getUint16(off + 28, true);
    entries.push({
      method: dv.getUint16(off + 10, true),
      size: dv.getUint32(off + 20, true),
      local: dv.getUint32(off + 42, true),
      name: new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nameLen)),
    });
    off += 46 + nameLen + dv.getUint16(off + 30, true) + dv.getUint16(off + 32, true);
  }

  const read = async (e: (typeof entries)[number]) => {
    const start = e.local + 30 + dv.getUint16(e.local + 26, true) + dv.getUint16(e.local + 28, true);
    const data = u8.slice(start, start + e.size);
    if (e.method === 0) return new TextDecoder().decode(data);
    if (e.method !== 8) return null;
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Response(stream).text();
  };

  // Prefer the date table (Chart.csv in current exports, Dates.csv in older ones);
  // otherwise any CSV that parses as daily clicks.
  const csvs = entries.filter((e) => /\.csv$/i.test(e.name));
  csvs.sort((a, b) => Number(/(^|\/)(chart|dates?)\.csv$/i.test(b.name)) - Number(/(^|\/)(chart|dates?)\.csv$/i.test(a.name)));
  for (const e of csvs) {
    const text = await read(e);
    if (text && parseDailyClicksCsv(text).length > 0) return text;
  }
  return null;
}

/** Read whatever the visitor dropped: a zip, or a CSV. */
export async function dailyClicksFromFile(file: File): Promise<DailyClicks[]> {
  const buf = await file.arrayBuffer();
  const isZip = new Uint8Array(buf.slice(0, 2))[0] === 0x50 && new Uint8Array(buf.slice(0, 2))[1] === 0x4b; // "PK"
  const text = isZip ? await csvFromZip(buf) : new TextDecoder().decode(buf);
  return text ? parseDailyClicksCsv(text) : [];
}

export interface BoardEntry {
  name: string;
  slug: string;
  score: number;
  clicks7d: number;
  clicks28d: number;
}

/**
 * Where these numbers would sit on today's board, ordered the same way the
 * board is (momentum score, then 7-day clicks), plus the volume view.
 */
export function placeOnBoard(summary: ExportSummary, board: BoardEntry[]) {
  const ahead = board.filter(
    (b) => b.score > summary.momentumScore || (b.score === summary.momentumScore && b.clicks7d > summary.clicks7d),
  );
  const rank = ahead.length + 1;
  const sorted = [...board].sort((a, b) => b.score - a.score || b.clicks7d - a.clicks7d);
  const volumeRank = board.filter((b) => b.clicks28d > summary.clicks28d).length + 1;
  return {
    rank,
    total: board.length + 1,
    above: sorted[rank - 2] ?? null,
    below: sorted[rank - 1] ?? null,
    volumeRank,
  };
}
