# RealRank — Product Map

RealRank is one core product — an honest, verified growth leaderboard — wrapped
in acquisition, retention, distribution, and monetization layers. This map lists
what each piece is and *why* it exists.

**The through-line:** a verified board (the moat) → a free listing tier lowers
the friction to enter → dashboard + founder status retain → SEO tools and
programmatic pages acquire → badges / MCP / stats distribute → sponsored slots
monetize.

---

## 1. The core — the verified momentum leaderboard

The whole reason the thing exists.

| Product | What it is | Why |
|---|---|---|
| **Leaderboard** (`/`, `/leaderboard`) | Sites ranked by verified Google Search Console organic clicks | The thesis: a ranking that **can't be faked** — real search traffic, not votes or third-party estimates. The core differentiator from every "top sites" list. |
| **Momentum vs. Volume views** | Rank by growth rate, not just raw clicks | So small, fast-growing sites can beat the giants — the story nobody else tells. |
| **Movers** (`/movers`) | This week's fastest climbers | Freshness and a recurring reason to return; feeds the weekly digest cron. |
| **Underdogs** (`/underdogs`) | High-momentum sites with low Domain Rating | Editorial hook — "punching above their weight" is inherently shareable. |
| **Founding Sites** (`/founding`) | The first N verified sites get permanent founder status | Scarcity incentive to connect Search Console *early*, while the board is small. |
| **Categories** (`/category/[slug]`) | Per-niche boards | Browsability plus long-tail SEO (niche leaderboards rank). |

## 2. The moat — verified ranking + owner value

What makes rankings real, and what keeps owners around once they connect.

| Product | What it is | Why |
|---|---|---|
| **GSC connection** (`/login`, Google OAuth) | Owners connect Search Console (read-only) | The integrity mechanism — traffic is proven from the owner's own Google data. |
| **Owner dashboard** (`/dashboard`, `/dashboard/analytics`, `/dashboard/channels`, `/dashboard/leaks`) | Search analytics, traffic breakdown, and "search leaks" (queries losing clicks) | Turns a vanity ranking into a **tool** — a reason to stay connected, not just appear once. "Leaks" is the retention hook. |

## 3. The front door — the open $0 listing tier

Added because growth stalled: verification was too high-friction, so subscribers
were stuck. The listing tier drops the barrier to zero.

| Product | What it is | Why |
|---|---|---|
| **Submit / Listed directory** (`/submit`, `/listed`, `/listed/[host]`) | List a project free, no GSC needed | Get projects in the door, then upsell to a verified rank. |
| **Owner verification via badge** (`/api/list/verify`, `/api/badge/[slug]`, `/api/embed/[slug]`) | Prove ownership by embedding a RealRank badge | Reciprocal-badge mechanism: verifies ownership *and* earns backlinks (distribution). Creates the trust ladder: **listed → owner-verified → ranked**. |
| **"Just listed" on the homepage** | Directory preview below the board | Rewards listing with instant homepage exposure (retention / shareback). Kept visually separate and unranked so it never blurs the verified board. |

## 4. Context metric

| Product | What it is | Why |
|---|---|---|
| **DR column** (Ahrefs Domain Rating) | A third-party authority score on the board | A recognizable benchmark alongside momentum. Deliberately secondary (sits last), never a ranking factor. Sourced from a direct Ahrefs API key, with the AnyAPI gateway as fallback. |

## 5. Acquisition — SEO content & free tools (lead magnets)

Programmatic and explainer pages that pull organic search traffic — eating our
own dog food.

| Product | Why |
|---|---|
| **Report Card** (`/report-card`), **Organic Growth Grade** (`/organic-growth-grade`), **Momentum Score Calculator** (`/momentum-score`) | Free "grade your site" tools — lead magnets that convert curiosity into signups. |
| **Is My Traffic Real?** (`/is-my-traffic-real`) | Explainer targeting "estimated vs verified traffic" searches; reinforces the core pitch. |
| **Best / Alternatives / Compare** (`/best/*`, `/alternatives/[slug]`, `/compare/[slug]`) | Programmatic pages capturing "best X", "X alternatives", and "X vs Y" long-tail queries at scale. |
| **Blog** (`/blog`), **About / How it works** (`/about`) | Topical authority and explaining how momentum works. |

## 6. Distribution, analytics & the agent angle

| Product | Why |
|---|---|
| **Launches** (`/launches`) | A Product-Hunt-style launch surface — a discovery and submission entry point. |
| **Public Stats** (`/stats`, `/stats/report`) | Transparency with real first-party numbers; makes the board feel alive and credible. |
| **Agent Visibility** (`/agent-visibility`) + **MCP endpoint** (`/api/mcp`) | Expose the leaderboard to AI agents / LLMs, and position "is your site visible to AI?" as a hook — riding the agent-readability trend. |
| **Badge marquee, attribution, `/go`, `/visit`, `/api/pulse`, `/api/event`** | Virality (embedded badges) and tracking where signups and clicks come from. |

## 7. Monetization

| Product | Why |
|---|---|
| **Sponsored slots** (in-board ad rows) + **Stripe attribution** (`/api/attribution/*`) | Revenue: paid placements in the leaderboard, with attribution tracking to see what converts. |

---

## The funnel, in one line

Verified board (moat) → free listing tier (front door) → dashboard + founder
status (retention) → SEO tools + programmatic pages (acquisition) → badges / MCP
/ stats (distribution) → sponsored slots (monetization).
