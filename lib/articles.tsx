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
];

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
