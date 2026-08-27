import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Blog posts as hand-authored content modules. Each Body is unique prose — no
 * shared copy template — so every page is a distinct, indexable document.
 */
export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  updated?: string;
  keywords: string[];
  Body: () => ReactNode;
}

const A = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
  // External links open in a new tab; internal use <Link> below.
  <a target="_blank" rel="noopener noreferrer" {...props} />
);

export const articles: Article[] = [
  {
    slug: "outbid-lol-explained",
    title: "Outbid.lol, explained: the $178K pay-to-rank board that started the .lol craze",
    description:
      "How Jonathan Wilke's outbid.lol turned a three-hour side project into a viral pay-to-rank leaderboard — and why it kicked off the .lol directory wave of 2026.",
    date: "2026-08-26",
    keywords: ["outbid.lol", "Jonathan Wilke", "pay to rank", ".lol directory", "leaderboard"],
    Body: () => (
      <>
        <p>
          In August 2026 a single-page website called{" "}
          <A href="https://outbid.lol/">outbid.lol</A> did something most SaaS
          products never manage: it became the most-shared link in indie tech
          within a day. The builder, German indie hacker{" "}
          <strong>Jonathan Wilke</strong> (also behind supastarter), reportedly
          put it together in about three hours.
        </p>
        <h2>The mechanic: pay $1 more, take the top spot</h2>
        <p>
          Outbid.lol threw out algorithms and ad auctions for one blunt rule:
          whoever pays one dollar more than the current leader takes the #1
          position on a public board. That&apos;s it. The result was a live,
          real-money game of king-of-the-hill that funded startups and solo
          developers couldn&apos;t stop playing.
        </p>
        <p>
          The numbers got absurd fast. Multiple write-ups reported roughly{" "}
          <strong>$178,000 in 77 hours</strong> (
          <A href="https://superframeworks.com/articles/outbid-lol-viral-launch">SuperFrameworks</A>
          ), ten-thousand-plus visitors within twelve hours, and an unsolicited
          six-figure acquisition offer before day one was over (
          <A href="https://automatio.ai/articles/dev-tools/inside-outbid-lol-the-pay-to-rank-board-taking-over-tech">automatio.ai</A>
          ).
        </p>
        <h2>Why it spread</h2>
        <p>
          Three ingredients: it was <strong>public</strong> (everyone could see
          the ranking), <strong>competitive</strong> (your rank could be taken at
          any moment), and <strong>shareable</strong> (&quot;I&apos;m #1&quot; is
          irresistible). Teams started monitoring the board minute by minute to
          protect the referral traffic a top spot sent them.
        </p>
        <h2>The catch with pay-to-rank</h2>
        <p>
          Pay-to-rank is a brilliant monetization gag, but the ranking measures
          exactly one thing: <em>who spent the most money right now</em>. It
          tells you nothing about which products are actually growing. As the
          clones multiplied, that limitation became the obvious opening.
        </p>
        <p>
          That&apos;s the gap <strong>RealRank</strong> fills. Instead of paying
          for a position, sites connect Google Search Console and are ranked by{" "}
          <strong>verified organic clicks</strong> — real growth, not real
          spend. See how it works on the{" "}
          <Link href="/">live leaderboard</Link> or the{" "}
          <Link href="/about">methodology page</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "lol-pay-to-rank-frenzy-2026",
    title: "The .lol pay-to-rank frenzy of 2026: outbid, the clones, and what comes next",
    description:
      "Outbid.lol spawned 170+ copycats in weeks. Here's a clear-eyed look at the .lol directory frenzy, why pay-to-rank plateaus, and where verified leaderboards go from here.",
    date: "2026-08-26",
    keywords: [".lol directories", "pay to rank", "outbid clones", "indie hackers", "leaderboard trend"],
    Body: () => (
      <>
        <p>
          When <A href="https://outbid.lol/">outbid.lol</A> exploded, the indie
          world did what it always does with a working formula: it copied it. By
          most counts the pay-to-rank format went from a handful of boards to{" "}
          <strong>170+ live and dead clones</strong> within weeks (
          <A href="https://saascity.io/blog/lol-bidding-directory-frenzy-outbid-payluck-2026">SaaSCity</A>
          ), each a variation on &quot;pay to sit at the top.&quot;
        </p>
        <h2>Why clones plateau</h2>
        <p>
          Pay-to-rank has a ceiling built into it. The board only rewards the
          highest bidder, so once the novelty fades you&apos;re left with a
          ranking that means &quot;richest this week&quot; — not
          &quot;best,&quot; not &quot;fastest-growing,&quot; not &quot;most
          useful.&quot; Visitors learn to discount it, and the auction cools.
        </p>
        <h2>The counter-trend: verified data</h2>
        <p>
          The more durable branch of the .lol wave is <em>verification</em>.{" "}
          <A href="https://trustmrr.com/">TrustMRR</A> (from Marc Lou) ranks
          startups by <strong>Stripe-verified revenue</strong> — no
          self-reported screenshots. The insight is that a ranking is only worth
          browsing if the underlying number is real and hard to fake.
        </p>
        <p>
          RealRank applies that same principle to a different metric:{" "}
          <strong>organic search traffic</strong>. Every site on the board has
          connected Google Search Console, so its click totals are pulled
          straight from Google — not estimated, not typed in. And because the
          default sort is <Link href="/about">momentum</Link> (growth velocity),
          a fast-rising small site can out-rank a flat giant.
        </p>
        <h2>Where this goes</h2>
        <p>
          The pay-to-rank boards were the spark; verified boards are the staying
          power. Expect the .lol category to consolidate around a few
          credible, data-backed leaderboards per metric — revenue (TrustMRR),
          and organic traffic (<Link href="/">RealRank</Link>). If you run a
          site, claiming a verified rank now is free and compounding.
        </p>
      </>
    ),
  },
  {
    slug: "trustmrr-vs-realrank",
    title: "TrustMRR verifies your revenue. RealRank verifies your traffic.",
    description:
      "Marc Lou's TrustMRR proved founders will connect real data for a trustworthy ranking. RealRank does the same for organic search traffic via Google Search Console.",
    date: "2026-08-26",
    keywords: ["TrustMRR", "verified MRR", "verified traffic", "RealRank", "Marc Lou", "indie SaaS"],
    Body: () => (
      <>
        <p>
          In late 2025, reacting to the flood of faked MRR screenshots, Marc Lou
          built <A href="https://trustmrr.com/">TrustMRR</A> in about 48 hours: a
          directory where founders connect Stripe, LemonSqueezy, or Polar to
          publish <strong>tamper-proof revenue</strong>. It now lists 800+
          startups and draws serious traffic (
          <A href="https://aiso.blog/trustmrr-review/">review</A>). The lesson was
          simple and powerful: <em>people trust rankings built on verified data,
          not vibes.</em>
        </p>
        <h2>Same idea, different metric</h2>
        <p>
          Revenue is one proof of traction. <strong>Organic search
          traffic</strong> is another — arguably the one every founder obsesses
          over and the one most often exaggerated. RealRank is the verified
          leaderboard for that metric:
        </p>
        <ul>
          <li>
            <strong>TrustMRR:</strong> connect Stripe → publish verified MRR →
            ranked by revenue.
          </li>
          <li>
            <strong>RealRank:</strong> connect Google Search Console
            (read-only) → publish verified clicks → ranked by{" "}
            <Link href="/about">momentum</Link> or volume.
          </li>
        </ul>
        <h2>Why verified traffic matters</h2>
        <p>
          Tools like SimilarWeb <em>estimate</em> traffic from models and can be
          off by an order of magnitude. Search Console is the source of truth —
          it&apos;s your actual click data from Google. A leaderboard built on it
          can&apos;t be gamed with a screenshot.
        </p>
        <p>
          If you already verify revenue on TrustMRR, verifying traffic on{" "}
          <Link href="/">RealRank</Link> is the natural next badge — and it takes
          one click to <Link href="/login">connect Search Console</Link>. The two
          together tell a complete traction story: real money and real demand.
        </p>
      </>
    ),
  },
  {
    slug: "pay-to-rank-vs-earn-your-rank",
    title: "Pay-to-rank vs earn-your-rank: why RealRank ranks by verified clicks",
    description:
      "Pay-to-rank boards rank by spend. RealRank ranks by verified organic growth. Here's the difference, and why earn-your-rank is the more useful leaderboard.",
    date: "2026-08-26",
    keywords: ["pay to rank", "earn your rank", "verified traffic", "momentum score", "SEO leaderboard"],
    Body: () => (
      <>
        <p>
          The .lol boom made &quot;leaderboard&quot; a marketing channel again.
          But there are two very different kinds, and it&apos;s worth being clear
          which one you&apos;re on.
        </p>
        <h2>Pay-to-rank</h2>
        <p>
          You buy the position. It&apos;s fun, it&apos;s viral, and it can raise
          real money — <A href="https://outbid.lol/">outbid.lol</A> proved that.
          But the ranking answers only &quot;who paid most,&quot; so it decays
          into a spending contest and browsers stop trusting the order.
        </p>
        <h2>Earn-your-rank</h2>
        <p>
          You earn the position with performance the platform can verify.
          RealRank pulls each site&apos;s organic clicks from Google Search
          Console and ranks by a <Link href="/about">momentum score</Link>:
        </p>
        <blockquote>
          momentum = (1 + growth) × log10(clicks in last 7 days + 1) × 100
        </blockquote>
        <p>
          Growth is your last 7 days versus the prior 21, weighted by a
          logarithm of volume so a small site with real momentum can beat a large
          flat one — without letting noise (5 → 15 clicks) top a steady 40k-click
          site. You can also flip to a pure <strong>volume</strong> view.
        </p>
        <h2>Why earn-your-rank wins long term</h2>
        <ul>
          <li><strong>Trust:</strong> the number is verified, not bought or typed in.</li>
          <li><strong>Fairness:</strong> new entrants can climb by growing, not by outspending.</li>
          <li><strong>Usefulness:</strong> the board actually surfaces what&apos;s working.</li>
        </ul>
        <p>
          It&apos;s free to claim your spot — <Link href="/login">connect Search
          Console</Link> and let real growth decide the order. Browse the{" "}
          <Link href="/">live leaderboard</Link> to see momentum in action.
        </p>
      </>
    ),
  },
  {
    slug: "read-search-console-momentum",
    title: "How to read your Search Console momentum — and actually improve it",
    description:
      "Your RealRank momentum comes straight from Google Search Console. Here's how to interpret the 7-day-vs-21-day trend behind it, and the levers that move it.",
    date: "2026-08-27",
    keywords: ["search console momentum", "organic clicks trend", "SEO growth", "how to improve rankings", "GSC"],
    Body: () => (
      <>
        <p>
          RealRank doesn&apos;t invent a growth number for you — it reads your{" "}
          <strong>actual clicks</strong> from Google Search Console and computes
          momentum from the shape of that trend. So the fastest way to
          understand your rank is to understand the two windows behind it.
        </p>
        <h2>The two windows that decide your momentum</h2>
        <p>
          Momentum compares your <strong>last 7 days</strong> of organic clicks
          against the <strong>prior 21 days</strong>, expressed as an average
          daily rate. If your recent week is beating your earlier baseline,
          you&apos;re accelerating and your momentum climbs. If it&apos;s
          slipping, you cool off. The volume of clicks is folded in
          logarithmically, so a real surge on a small site counts, but random
          5-to-15-click wobble can&apos;t leapfrog a steady performer. The full
          formula is on the <Link href="/about">methodology page</Link>, and the
          reasoning behind it in{" "}
          <Link href="/blog/pay-to-rank-vs-earn-your-rank">earn-your-rank</Link>.
        </p>
        <h2>How to read your own trend in GSC</h2>
        <p>
          Open Search Console → <em>Performance → Search results</em>, set the
          date range to <strong>Last 28 days</strong>, and turn on{" "}
          <em>Clicks</em>. Mentally split the chart: the most recent 7 days
          versus the three weeks before. That eyeball comparison is essentially
          what RealRank scores. A rising right-hand edge is momentum; a flat or
          drooping one is a plateau to break.
        </p>
        <h2>The levers that actually move it</h2>
        <ul>
          <li>
            <strong>Refresh decaying winners.</strong> Find pages whose clicks
            fell quarter-over-quarter and update them — new data, a better
            title, an added section. Recovering existing rankings moves the
            7-day window faster than net-new pages.
          </li>
          <li>
            <strong>Improve titles on high-impression, low-CTR queries.</strong>{" "}
            Sort your queries by impressions, find the ones with a weak
            click-through rate, and rewrite those titles. It converts traffic you
            already earned but weren&apos;t capturing.
          </li>
          <li>
            <strong>Ship on a cadence.</strong> Momentum rewards a rising recent
            week, so a steady publishing or updating rhythm compounds better than
            one big batch followed by silence.
          </li>
          <li>
            <strong>Fix what fell out of the index.</strong> Coverage drops and
            accidental <code>noindex</code> tags quietly erase clicks. The{" "}
            <em>Pages</em> report tells you what Google stopped serving.
          </li>
        </ul>
        <p>
          None of this games the board — it&apos;s the same work that grows the
          business. That&apos;s the point of a verified leaderboard: the only way
          up is real growth. Connect your property and watch the trend on your{" "}
          <Link href="/dashboard">dashboard</Link>, or see where you&apos;d land
          on the <Link href="/">live board</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "verified-vs-estimated-traffic",
    title: "Verified traffic vs estimated traffic: why SimilarWeb and RealRank disagree",
    description:
      "Third-party tools model your traffic from clickstream panels and can be wildly off. Search Console is the source of truth. Here's why the numbers differ — and which to trust.",
    date: "2026-08-27",
    keywords: ["verified traffic", "similarweb accuracy", "estimated traffic", "search console data", "traffic estimates"],
    Body: () => (
      <>
        <p>
          If you&apos;ve ever looked up your own site on a traffic-estimation
          tool and thought &quot;that&apos;s not even close,&quot; you&apos;re
          not imagining it. Estimated traffic and verified traffic are two
          fundamentally different things, and the gap matters when a leaderboard
          is involved.
        </p>
        <h2>How estimates are made</h2>
        <p>
          Tools like SimilarWeb, Semrush, and Ahrefs don&apos;t see your real
          analytics. They <em>model</em> traffic from a mix of clickstream panels
          (browsing data from a sample of users), keyword-ranking databases, and
          machine-learned extrapolation. For huge sites the model is decent. For
          the long tail — most startups and indie projects — the sample is thin,
          so the estimate can be off by an order of magnitude in either
          direction. That&apos;s inherent to sampling, not a bug.
        </p>
        <h2>What Search Console actually is</h2>
        <p>
          Google Search Console reports your{" "}
          <strong>real clicks from Google Search</strong> — not a sample, not a
          model. It&apos;s Google telling you how many times someone clicked
          through to your site from its results. There&apos;s no closer source of
          truth for organic search traffic, because it <em>is</em> the source.
        </p>
        <h2>Why RealRank uses the verified number</h2>
        <p>
          A leaderboard is only as trustworthy as its worst data point. If
          rankings came from estimates, a site could out- or under-rank purely
          because a model guessed wrong. RealRank sidesteps that entirely: every
          site connects Search Console (read-only) and its clicks are read
          straight from Google. Nobody types in a number; nobody uploads a
          screenshot. This is the same verification principle{" "}
          <Link href="/blog/trustmrr-vs-realrank">TrustMRR applied to revenue</Link>{" "}
          via Stripe.
        </p>
        <h2>The practical takeaway</h2>
        <p>
          Use estimation tools for what they&apos;re good at — competitive
          research on sites you <em>don&apos;t</em> own, where they&apos;re your
          only option. But for proving your own traffic, or comparing yourself
          fairly against peers, verified beats estimated every time. That&apos;s
          the whole reason RealRank exists — see the{" "}
          <Link href="/best/lol-directories">verified vs pay-to-rank landscape</Link>{" "}
          or <Link href="/login">connect your own property</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "grow-saas-organic-traffic",
    title: "How to grow your SaaS's organic traffic: a founder's playbook",
    description:
      "A practical, no-fluff playbook for growing SaaS organic search traffic — the compounding channel that keeps paying after you stop spending. Written for founders, not agencies.",
    date: "2026-08-27",
    keywords: ["grow SaaS organic traffic", "SaaS SEO", "content marketing", "programmatic SEO", "founder SEO playbook"],
    Body: () => (
      <>
        <p>
          Paid acquisition stops the moment you stop paying. Organic search is
          the opposite: a page that ranks keeps sending visitors for months or
          years at near-zero marginal cost. That compounding is why organic
          traffic is the growth metric most founders quietly obsess over — and
          the one RealRank was built to rank fairly. Here&apos;s how to actually
          grow it.
        </p>
        <h2>1. Win the problem-aware searches first</h2>
        <p>
          Before people search for your category, they search for their problem.
          &quot;Why is my invoice overdue&quot; comes long before &quot;invoicing
          software.&quot; Map the questions your ideal customer types <em>on the
          way</em> to needing you, and answer each one properly on its own page.
          These convert worse per visit but are far easier to rank for, and they
          catch people early.
        </p>
        <h2>2. Build comparison and alternative pages</h2>
        <p>
          &quot;[Competitor] alternative&quot; and &quot;[Tool A] vs [Tool
          B]&quot; searches come from people with a credit card already out. They
          rank quickly because few competitors write them honestly. Be fair, be
          specific, and don&apos;t pretend you win every row of the table —
          credibility is what converts.
        </p>
        <h2>3. Use programmatic SEO where the data is real</h2>
        <p>
          If you have structured data — templates, integrations, locations,
          stats — you can generate hundreds of genuinely useful pages from it.
          The trap is thin, near-duplicate pages that Google treats as spam. The
          rule: each page must answer a distinct query with real, page-specific
          value. (RealRank&apos;s own per-site profile pages follow this — one
          real, data-backed page per verified site.)
        </p>
        <h2>4. Refresh before you write new</h2>
        <p>
          Updating a page that already ranks on page two is usually a better hour
          spent than starting a new one from zero. Google rewards freshness and
          you keep the link equity the URL already earned. Pull your{" "}
          <Link href="/blog/read-search-console-momentum">Search Console trend</Link>{" "}
          and fix the decliners first.
        </p>
        <h2>5. Earn a few real links, ignore the rest</h2>
        <p>
          A handful of genuinely relevant links from sites in your space beats a
          hundred low-quality ones. Original data, free tools, and honest teardowns
          are the most reliable link magnets — they give other people a reason to
          cite you.
        </p>
        <h2>Measure momentum, not vanity</h2>
        <p>
          Total traffic flatters incumbents. What tells you the strategy is
          working is <em>momentum</em> — this week beating last month. That&apos;s
          exactly what RealRank scores, straight from your verified Search Console
          data. <Link href="/login">Connect your property</Link> and watch the
          curve, or see who&apos;s growing fastest on the{" "}
          <Link href="/best/fastest-growing-saas-websites">SaaS momentum board</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "connect-search-console-read-only-safe",
    title: "Is it safe to connect Google Search Console? What read-only access really means",
    description:
      "RealRank asks for read-only Search Console access and nothing else. Here's exactly what that scope can and can't do, how your data is handled, and how to revoke it anytime.",
    date: "2026-08-27",
    keywords: ["search console read-only", "webmasters.readonly", "oauth safety", "connect google search console", "data privacy"],
    Body: () => (
      <>
        <p>
          Connecting any account to a third-party service deserves a moment of
          suspicion — good instinct. So here&apos;s a straight answer about what
          happens when you connect Google Search Console to RealRank, with no
          hand-waving.
        </p>
        <h2>The exact permission we request</h2>
        <p>
          One scope: <code>webmasters.readonly</code>. The word{" "}
          <strong>readonly</strong> is the whole story. It lets RealRank{" "}
          <em>read</em> the search-performance data for properties you already own
          — clicks, impressions, the list of your verified sites. It{" "}
          <strong>cannot</strong> change your settings, submit or remove URLs,
          alter sitemaps, add or remove users, or touch anything outside Search
          Console. There is no write access to give away because we never ask for
          it.
        </p>
        <h2>What we actually read, and store</h2>
        <p>
          For properties <em>you choose to publish</em>, we read your total
          organic clicks over the last 7 and 28 days — the minimum needed to
          compute <Link href="/about">momentum and volume</Link>. We don&apos;t
          pull your individual queries or URLs into the public board. Your
          Google refresh token is <strong>encrypted at rest</strong> and never
          exposed to the browser or to other users; it&apos;s used server-side
          only, to refresh those click totals on schedule.
        </p>
        <h2>You stay in control</h2>
        <ul>
          <li>
            <strong>Nothing is public until you publish it.</strong> Connecting
            just lists your verified properties on your private dashboard. You
            pick which — if any — go on the board.
          </li>
          <li>
            <strong>Unpublish anytime</strong> to remove a site from the public
            leaderboard.
          </li>
          <li>
            <strong>Revoke access in one click</strong> from your{" "}
            <A href="https://myaccount.google.com/permissions">Google account permissions</A>{" "}
            page — that instantly cuts off our read access, independent of
            RealRank.
          </li>
        </ul>
        <h2>Why read-only is the honest design</h2>
        <p>
          A leaderboard has no legitimate reason to modify your Search Console. By
          requesting the narrowest possible scope, the worst-case blast radius is
          bounded to &quot;someone could see the click totals you already chose to
          publish&quot; — which is the entire point of a public board. That&apos;s
          the same trust-through-verification idea behind the whole{" "}
          <Link href="/best/lol-directories">verified-leaderboard movement</Link>.
          Ready? <Link href="/login">Connect Search Console</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "indie-hacker-leaderboards-2026",
    title: "The indie hacker leaderboard landscape in 2026",
    description:
      "From pay-to-rank boards to Stripe-verified revenue to verified organic traffic — a field guide to the leaderboards indie hackers are watching in 2026, and what each actually measures.",
    date: "2026-08-27",
    keywords: ["indie hacker leaderboards", "startup directories 2026", "outbid.lol", "trustmrr", "realrank", ".lol trend"],
    Body: () => (
      <>
        <p>
          2026 turned the public leaderboard into a genre of its own. What began
          as a viral money-game spun off into a whole category of ranking sites,
          each measuring something different. Here&apos;s a field guide to the
          ones worth knowing and, more importantly, <em>what each one actually
          proves</em>.
        </p>
        <h2>The spark: pay-to-rank</h2>
        <p>
          <A href="https://outbid.lol/">outbid.lol</A>, from{" "}
          <strong>Jonathan Wilke</strong>, lit the fuse — pay a dollar more than
          the leader to take #1, reportedly ~$178K in 77 hours, and a wave of
          170+ clones behind it (full story in{" "}
          <Link href="/blog/outbid-lol-explained">our breakdown</Link>). These
          boards are pure spectacle and pure spend: the ranking measures who paid
          most, right now, and nothing else. Fun, viral, and — by design —
          impossible to &quot;earn.&quot;
        </p>
        <h2>The correction: verified data</h2>
        <p>
          The durable branch of the trend swapped spend for proof.
        </p>
        <ul>
          <li>
            <strong><A href="https://trustmrr.com/">TrustMRR</A></strong> (Marc
            Lou) ranks startups by <em>Stripe-verified revenue</em> — connect
            your payment provider, publish tamper-proof MRR. 800+ startups and a{" "}
            <A href="https://trustmrr.com/special-category/lol">.lol category</A>{" "}
            of its own.
          </li>
          <li>
            <strong><Link href="/">RealRank</Link></strong> ranks by{" "}
            <em>verified organic traffic</em> — connect Google Search Console
            (read-only), publish real click totals, get ranked by momentum or
            volume.
          </li>
        </ul>
        <p>
          Different metrics, same principle: a ranking is only worth browsing if
          the number behind it is real and hard to fake. We made that case in{" "}
          <Link href="/blog/pay-to-rank-vs-earn-your-rank">pay-to-rank vs earn-your-rank</Link>.
        </p>
        <h2>Where the category settles</h2>
        <p>
          Expect consolidation around a few <strong>credible boards per
          metric</strong> rather than endless clones. Revenue has a clear leader;
          organic traffic is being claimed now. The pay-to-rank boards will keep
          popping up as launch stunts — they&apos;re great marketing — but the
          leaderboards founders actually <em>keep a tab open on</em> will be the
          verified ones, because those are the ones that mean something.
        </p>
        <p>
          If you run a site, the verified boards are the ones worth a badge on
          your homepage. <Link href="/login">Claim your verified traffic rank</Link>{" "}
          — it&apos;s free and it compounds.
        </p>
      </>
    ),
  },
  {
    slug: "momentum-score-explained",
    title: "What's a good momentum score? Reading — and climbing — the RealRank board",
    description:
      "Momentum isn't an absolute grade, it's a ranking of growth velocity. Here's how to interpret your score, why it moves week to week, and the honest ways to climb.",
    date: "2026-08-27",
    keywords: ["momentum score", "realrank ranking", "growth velocity", "how to rank higher", "SEO momentum"],
    Body: () => (
      <>
        <p>
          The most common question about RealRank is &quot;what&apos;s a{" "}
          <em>good</em> momentum score?&quot; The honest answer: it&apos;s not a
          grade out of 100 — it&apos;s a <strong>ranking of velocity</strong>. A
          score is only meaningful relative to everyone else&apos;s on the board
          that day.
        </p>
        <h2>Why the number isn&apos;t absolute</h2>
        <p>
          Momentum combines two things: how fast your recent week is growing
          versus your prior three weeks, and a logarithm of your click volume so
          the growth is anchored to real traffic. That means a small site
          doubling its clicks can post a higher momentum than a large site
          growing 5% — which is the point. The board rewards{" "}
          <em>who&apos;s accelerating</em>, not who&apos;s biggest. The exact
          formula lives on the <Link href="/about">methodology page</Link>.
        </p>
        <h2>Why your score moves week to week</h2>
        <p>
          Because the 7-day window slides every day, your score is naturally
          alive. A great launch week will spike it, then it settles as that week
          becomes the new baseline. A drop isn&apos;t failure — it often just
          means last week set a high bar. Watch the <em>trend</em> of your rank
          over weeks, not any single day.
        </p>
        <h2>Two views, two questions</h2>
        <ul>
          <li>
            <strong>Momentum</strong> answers &quot;who&apos;s growing fastest
            right now?&quot; — the default board.
          </li>
          <li>
            <strong>Volume</strong> answers &quot;who&apos;s biggest?&quot; —
            total clicks over 28 days, for when you want the incumbents.
          </li>
        </ul>
        <p>
          Flip between them with the toggle on the{" "}
          <Link href="/">leaderboard</Link>. Most fast-growing sites rank far
          higher on momentum than volume — that contrast <em>is</em> the story
          worth sharing.
        </p>
        <h2>The honest ways to climb</h2>
        <p>
          There&apos;s no trick, because the input is verified: the only way up is
          more real clicks this week than last. Refresh decaying pages, fix titles
          on high-impression queries, and ship on a cadence — the specifics are in{" "}
          <Link href="/blog/read-search-console-momentum">reading your Search Console momentum</Link>{" "}
          and the{" "}
          <Link href="/blog/grow-saas-organic-traffic">organic growth playbook</Link>.
          Do the work, and the board reflects it automatically.{" "}
          <Link href="/login">Connect Search Console</Link> to get on it.
        </p>
      </>
    ),
  },
  {
    slug: "sc-domain-vs-url-prefix",
    title: "sc-domain vs URL-prefix: which Search Console property should you publish?",
    description:
      "Google Search Console has two property types, and they report different totals. Here's the difference, which one to verify, and which to publish on RealRank for the truest numbers.",
    date: "2026-08-27",
    keywords: ["sc-domain vs url-prefix", "search console property types", "domain property", "GSC verification", "which property"],
    Body: () => (
      <>
        <p>
          When you open Search Console you&apos;ll see properties prefixed either
          with <code>sc-domain:</code> or a full <code>https://</code> URL. They
          look similar but count different things — and picking the wrong one to
          publish can under-report your traffic. Here&apos;s the plain-English
          version.
        </p>
        <h2>URL-prefix properties</h2>
        <p>
          A URL-prefix property covers <strong>exactly one prefix</strong> —{" "}
          <code>https://www.example.com/</code> and{" "}
          <code>https://example.com/</code> are two separate properties, and
          neither includes the other&apos;s traffic or your subdomains. It&apos;s
          verified per-prefix (HTML tag, file, DNS, or Analytics). If you only
          verify <code>https://example.com/</code> but most visitors land on the{" "}
          <code>www</code> version, you&apos;ll see a fraction of your real
          clicks.
        </p>
        <h2>Domain properties (<code>sc-domain:</code>)</h2>
        <p>
          A domain property covers <strong>every subdomain and both
          protocols</strong> — <code>www</code> and bare, <code>http</code> and{" "}
          <code>https</code>, <code>blog.</code>, <code>app.</code>, all of it —
          under one roof. It&apos;s verified once via DNS. For almost everyone
          this is the <strong>truest single picture</strong> of your organic
          traffic, which is why it&apos;s worth setting up.
        </p>
        <h2>Which to publish on RealRank</h2>
        <p>
          Publish the property that represents your <em>whole site</em>. In
          practice that&apos;s almost always the <code>sc-domain:</code> domain
          property — it aggregates every entrance to your site, so your momentum
          and volume reflect all of your organic traffic rather than one
          subdomain. RealRank handles <code>sc-domain:</code> properties natively
          and displays a clean hostname for them on the board.
        </p>
        <h2>If you only have a URL-prefix property</h2>
        <p>
          It still works — RealRank will rank it — but consider adding the domain
          property too (a single DNS record) so nothing is missed. Once
          it&apos;s verified in Google, it&apos;ll appear on your{" "}
          <Link href="/dashboard">RealRank dashboard</Link> ready to publish.
        </p>
        <p>
          Not sure any of it is safe to connect? We break down the exact
          read-only permission in{" "}
          <Link href="/blog/connect-search-console-read-only-safe">what read-only access really means</Link>.
          Otherwise, <Link href="/login">connect and pick your property</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "rank-badge-social-proof",
    title: "Turn your rank into social proof: the embeddable RealRank badge",
    description:
      "A verified rank is only worth as much as the people who see it. Here's how the embeddable RealRank badge turns your organic-traffic ranking into homepage-ready social proof.",
    date: "2026-08-27",
    keywords: ["rank badge", "social proof", "embeddable badge", "verified traffic badge", "startup credibility"],
    Body: () => (
      <>
        <p>
          &quot;#3 fastest-growing SaaS by verified organic traffic&quot; is a
          very different claim from &quot;we&apos;re growing fast.&quot; One is a
          checkable third-party fact; the other is a founder&apos;s adjective. The
          RealRank badge exists to turn the first kind of statement into
          something you can put on your homepage.
        </p>
        <h2>Why a verified badge converts</h2>
        <p>
          Social proof works when it&apos;s <em>credible</em>, and credibility
          comes from being independently verifiable. A badge backed by Google
          Search Console data — that a visitor can click through to confirm on
          the public board — carries weight that a self-declared stat can&apos;t.
          It&apos;s the same reason a{" "}
          <Link href="/blog/trustmrr-vs-realrank">Stripe-verified revenue badge</Link>{" "}
          lands differently than an MRR screenshot.
        </p>
        <h2>How the badge works</h2>
        <p>
          Every published site gets an SVG badge showing its live rank. Because
          it&apos;s server-rendered from the same data as the board, it
          can&apos;t go stale or be faked — it always reflects your current
          standing. Drop it in your footer, your README, a launch post, or a
          pitch deck. When your rank improves, the badge updates itself.
        </p>
        <h2>Where to use it</h2>
        <ul>
          <li>
            <strong>Homepage &amp; pricing pages</strong> — right where
            hesitation happens.
          </li>
          <li>
            <strong>GitHub README</strong> — for developer-tool and open-source
            projects, a live traffic rank is unusual and eye-catching.
          </li>
          <li>
            <strong>Launch and &quot;we&apos;re #N&quot; posts</strong> — the
            badge gives the claim a source, and the source links back to you.
          </li>
        </ul>
        <h2>The compounding loop</h2>
        <p>
          Here&apos;s the quiet benefit: every badge links back to your{" "}
          <Link href="/">RealRank profile</Link>, and every share points more
          people at the board. Verified rank drives credibility, credibility
          drives shares, shares drive discovery — a growth loop where the fuel is
          simply real growth you were achieving anyway.
        </p>
        <p>
          Get your badge by publishing a property —{" "}
          <Link href="/login">connect Search Console</Link>, and it&apos;s
          generated automatically for your site.
        </p>
      </>
    ),
  },
];

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
