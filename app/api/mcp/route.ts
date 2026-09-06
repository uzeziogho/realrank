import { NextRequest, NextResponse } from "next/server";
import {
  momentumLeaders,
  siteTrustProfile,
  compareSites,
  searchTrendingInCategory,
  CATEGORY_SLUGS,
} from "@/lib/agent";

/**
 * RealRank MCP server — a public, READ-ONLY trust layer over the verified
 * leaderboard, so AI assistants can check real Google Search Console momentum
 * instead of self-reported or estimated numbers.
 *
 * Transport: stateless Streamable HTTP (single JSON response per POST). No
 * sessions, no writes, no private data — only what's already public on the board
 * (never the Channels/Stripe revenue tables).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVER_INFO = { name: "realrank", version: "1.0.0" };
const DEFAULT_PROTOCOL = "2025-06-18";
const INSTRUCTIONS =
  "RealRank exposes verified organic-traffic rankings from Google Search Console. " +
  "Every result includes verified_since / days_of_verified_history — how long the site " +
  "has had real verified data, an unfakeable trust signal. Read-only: you can query rankings " +
  "and per-domain profiles, but never modify them. Categories: " +
  CATEGORY_SLUGS.join(", ") +
  ".";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, mcp-protocol-version, mcp-session-id",
};

interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: Record<string, unknown>;
}

const READONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

const TOOLS: ToolDef[] = [
  {
    name: "get_momentum_leaders",
    title: "Momentum leaders",
    description:
      "Get the top verified-traffic sites in a category, ranked by real Google Search Console growth velocity (momentum) — not self-reported or estimated traffic. Each row includes verified_since and days_of_verified_history.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: CATEGORY_SLUGS,
          description: "Optional category slug to scope the ranking.",
        },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 10 },
        sort_by: {
          type: "string",
          enum: ["momentum", "volume"],
          default: "momentum",
          description: "'momentum' = growth velocity (default); 'volume' = total 28-day clicks.",
        },
      },
      additionalProperties: false,
    },
    annotations: READONLY,
  },
  {
    name: "get_site_trust_profile",
    title: "Site trust profile",
    description:
      "Get verified growth and trust data for a specific domain — real GSC-verified clicks, momentum, ranks, and how long it's been verified. Returns verified:false with a note for domains not on RealRank.",
    inputSchema: {
      type: "object",
      properties: { domain: { type: "string", description: "A domain, e.g. 'example.com'." } },
      required: ["domain"],
      additionalProperties: false,
    },
    annotations: READONLY,
  },
  {
    name: "compare_sites",
    title: "Compare sites",
    description:
      "Head-to-head comparison of two or more domains on verified momentum, volume rank, trend, and history length — useful when deciding between competing tools.",
    inputSchema: {
      type: "object",
      properties: {
        domains: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 10 },
      },
      required: ["domains"],
      additionalProperties: false,
    },
    annotations: READONLY,
  },
  {
    name: "search_trending_in_category",
    title: "Trending in category",
    description:
      "Find the fastest-growing verified sites in a category. Optionally require a minimum length of verified history to filter out brand-new entrants.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", enum: CATEGORY_SLUGS },
        min_days_verified: { type: "integer", minimum: 0 },
      },
      required: ["category"],
      additionalProperties: false,
    },
    annotations: READONLY,
  },
];

type Json = Record<string, unknown>;

interface ToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?: Json;
  isError?: boolean;
}

function ok(data: unknown): ToolResult {
  const structured: Json = Array.isArray(data) ? { results: data } : (data as Json);
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: structured,
  };
}

function toolError(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

async function callTool(name: string, args: Json): Promise<ToolResult> {
  switch (name) {
    case "get_momentum_leaders": {
      const category = args.category as string | undefined;
      if (category && !CATEGORY_SLUGS.includes(category)) {
        return toolError(`Unknown category "${category}". Valid categories: ${CATEGORY_SLUGS.join(", ")}.`);
      }
      const rows = await momentumLeaders({
        category,
        limit: typeof args.limit === "number" ? args.limit : undefined,
        sortBy: args.sort_by === "volume" ? "volume" : "momentum",
      });
      return ok(rows);
    }
    case "get_site_trust_profile": {
      if (typeof args.domain !== "string" || !args.domain.trim()) {
        return toolError("`domain` is required (e.g. \"example.com\").");
      }
      return ok(await siteTrustProfile(args.domain));
    }
    case "compare_sites": {
      if (!Array.isArray(args.domains) || args.domains.length < 2) {
        return toolError("`domains` must be an array of at least 2 domains.");
      }
      return ok(await compareSites(args.domains as string[]));
    }
    case "search_trending_in_category": {
      const category = args.category as string | undefined;
      if (!category || !CATEGORY_SLUGS.includes(category)) {
        return toolError(`\`category\` is required and must be one of: ${CATEGORY_SLUGS.join(", ")}.`);
      }
      return ok(
        await searchTrendingInCategory({
          category,
          minDaysVerified: typeof args.min_days_verified === "number" ? args.min_days_verified : undefined,
        }),
      );
    }
    default:
      return toolError(`Unknown tool "${name}".`);
  }
}

/** Handle a single JSON-RPC request object; returns the result payload or throws a coded error. */
async function handleMethod(method: string, params: Json, requested: string | undefined): Promise<Json> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: requested ?? DEFAULT_PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call": {
      const name = params.name as string;
      const args = (params.arguments as Json) ?? {};
      if (!name) throw { code: -32602, message: "Missing tool name." };
      return (await callTool(name, args)) as unknown as Json;
    }
    default:
      throw { code: -32601, message: `Method not found: ${method}` };
  }
}

function rpcError(id: unknown, code: number, message: string): Json {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

async function processMessage(msg: Json, protocol: string | undefined): Promise<Json | null> {
  const id = msg.id;
  // Notifications have no id — process (no-op) and return nothing.
  if (id === undefined || id === null) return null;
  const method = msg.method as string;
  if (typeof method !== "string") return rpcError(id, -32600, "Invalid Request");
  try {
    const result = await handleMethod(method, (msg.params as Json) ?? {}, protocol);
    return { jsonrpc: "2.0", id, result };
  } catch (err) {
    const e = err as { code?: number; message?: string };
    if (typeof e?.code === "number") return rpcError(id, e.code, e.message ?? "Error");
    console.error("[mcp] handler error:", err);
    return rpcError(id, -32603, "Internal error");
  }
}

export async function POST(req: NextRequest) {
  const protocol = req.headers.get("mcp-protocol-version") ?? undefined;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400, headers: CORS_HEADERS });
  }

  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map((m) => processMessage(m as Json, protocol)))).filter(
      (r): r is Json => r !== null,
    );
    if (responses.length === 0) return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
    return NextResponse.json(responses, { headers: CORS_HEADERS });
  }

  const response = await processMessage(body as Json, protocol);
  if (response === null) return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  return NextResponse.json(response, { headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** This stateless server has no SSE stream; tell probing clients to POST. */
export function GET() {
  return NextResponse.json(
    { error: "Use POST with JSON-RPC (stateless Streamable HTTP). See serverInfo via initialize." },
    { status: 405, headers: { ...CORS_HEADERS, Allow: "POST, OPTIONS" } },
  );
}
