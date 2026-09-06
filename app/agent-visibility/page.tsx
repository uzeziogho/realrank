import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ShieldCheck, Clock, Search, GitCompare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Agent Visibility — Your Verified Rank, Queryable by AI",
  description:
    "RealRank's verified Google Search Console rankings are available to AI assistants via MCP. When an agent is asked to compare tools in your category, your verified momentum is data it can actually check — and the longer you're verified, the stronger your signal.",
  alternates: { canonical: "/agent-visibility" },
};

const MCP_URL = `${siteConfig.url}/api/mcp`;

const tools = [
  {
    icon: Search,
    name: "get_momentum_leaders",
    body: "The fastest-growing verified sites in a category, by real Search Console momentum.",
  },
  {
    icon: ShieldCheck,
    name: "get_site_trust_profile",
    body: "Verified momentum, ranks, and how long a specific domain has had real data.",
  },
  {
    icon: GitCompare,
    name: "compare_sites",
    body: "Head-to-head on verified momentum, volume, trend, and history length.",
  },
  {
    icon: Search,
    name: "search_trending_in_category",
    body: "Rising verified tools in a category, filterable by length of verified history.",
  },
];

export default function AgentVisibilityPage() {
  return (
    <div className="container max-w-3xl py-16">
      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary">
        <Bot className="size-4" /> Agent visibility
      </span>
      <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-5xl">
        Your verified rank, queryable by AI
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        When someone asks ChatGPT or Claude to recommend a tool in your category, your{" "}
        <strong className="text-foreground">verified</strong> Search Console momentum is data an
        agent can actually check — not just something a human might stumble on. RealRank exposes its
        verified rankings to AI assistants through the Model Context Protocol (MCP).
      </p>

      {/* The moat */}
      <div className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-tight">Why staying connected compounds</h2>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Every answer includes <code className="text-foreground">verified_since</code> and{" "}
          <code className="text-foreground">days_of_verified_history</code> — how long you&apos;ve had
          real, verified data. An agent comparing two similar tools sees a concrete, unfakeable
          signal: <em>this one&apos;s been verified for 400 days, this one for 12.</em> A brand-new
          clone can&apos;t produce that on day one. The longer you stay connected, the stronger your
          signal gets — which is exactly why this is a reason to keep your Search Console linked, not
          a one-time check.
        </p>
      </div>

      {/* Tools */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">What agents can ask</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only. Agents can query the rankings; they can never change them, submit data, or bid.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {tools.map((t) => (
            <div key={t.name} className="rounded-xl border border-border bg-card p-5">
              <t.icon className="size-5 text-primary" />
              <p className="mt-3 font-mono text-sm font-medium">{t.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Connect the server */}
      <div className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">Connect the RealRank MCP server</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add this read-only endpoint to any MCP-compatible client (Claude, and other assistants
          that support MCP):
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-xs text-foreground">
{`{
  "mcpServers": {
    "realrank": {
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`}
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          Endpoint: <code className="text-foreground">{MCP_URL}</code> · stateless Streamable HTTP ·
          no auth · read-only.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-12 flex flex-col items-center gap-3 text-center">
        <p className="text-muted-foreground">
          The clock only starts once you&apos;re verified. The sooner you connect, the longer your
          history when an agent asks.
        </p>
        <Button asChild size="lg">
          <Link href="/login">
            Connect Search Console <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
