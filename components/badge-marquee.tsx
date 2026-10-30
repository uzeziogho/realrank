"use client";

import { useState } from "react";

/**
 * "Featured on" badge bar — a continuous left-to-right marquee of third-party
 * feature badges. External badge images are rendered with a plain <img> (same
 * as the footer badges) since they're hosted on the partners' domains. Pauses
 * on hover and respects prefers-reduced-motion.
 *
 * A badge whose image fails to load is hidden, so a partner's broken/removed
 * SVG can't leave an empty anchor in the strip — which read as a dead click in
 * Clarity. The anchors are still in the server-rendered HTML (this renders on
 * the server before hydration), so badge-verification checkers still see them.
 */

interface Badge {
  href: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Link rel; defaults to "noopener". Kept per-badge so sponsored links stay disclosed. */
  rel?: string;
  /** Optional title attribute (e.g. tinyshelf's verification checker looks for it). */
  title?: string;
  /**
   * Render a bare anchor with no `rel`/`target` — some directories' badge
   * verification checkers require the exact link form (e.g. tinyshelf).
   */
  plain?: boolean;
  /**
   * Extra attributes spread onto the <a> — some checkers look for a specific
   * data attribute on the link (e.g. LaunchAF's data-launchaf-badge).
   */
  dataAttrs?: Record<string, string>;
}

const BADGES: Badge[] = [
  {
    href: "https://nicklaunches.com/products/realrank/?utm_source=realrank.lol&utm_medium=badge&utm_campaign=featured",
    src: "https://nicklaunches.com/badges/featured.png",
    alt: "RealRank on Nick Launches",
    width: 244,
    height: 56,
  },
  {
    href: "https://letslaunch.today/product/realrank",
    src: "https://letslaunch.today/badge/realrank.svg",
    alt: "RealRank on LetsLaunch",
    width: 250,
    height: 54,
  },
  {
    href: "https://www.tinyshelf.co/?ref=realrank.lol",
    src: "https://www.tinyshelf.co/badge/tinyshelf-badge-dark-f4d1216a.svg",
    alt: "Featured on tinyshelf",
    width: 216,
    height: 64,
    title: "Featured on tinyshelf",
    // tinyshelf's checker requires the bare anchor (href with ?ref, no rel/target).
    plain: true,
  },
  {
    href: "https://marketingdb.live",
    src: "https://marketingdb.live/badge-light.svg",
    alt: "Listed on MarketingDB",
    width: 190,
    height: 44,
    rel: "noopener noreferrer nofollow sponsored",
  },
  {
    href: "https://findly.tools/realrank?utm_source=realrank",
    src: "https://findly.tools/badges/findly-tools-badge-light.svg",
    alt: "Featured on Findly.tools",
    width: 175,
    height: 55,
    rel: "noopener noreferrer",
  },
  {
    href: "https://dang.ai",
    src: "https://assets.dang.ai/badges/dang-verified-light.png",
    alt: "Verified on DANG!",
    width: 260,
    height: 94,
    rel: "dofollow noopener",
  },
  {
    href: "https://twelve.tools",
    src: "https://twelve.tools/badge0-white.svg",
    alt: "Featured on Twelve Tools",
    width: 148,
    height: 40,
  },
  {
    href: "https://www.superlaun.ch/products/3418",
    src: "https://www.superlaun.ch/badge.png",
    alt: "Featured on Super Launch",
    width: 300,
    height: 300,
    rel: "noopener",
  },
  {
    href: "https://codehype.ai/product/realrank?utm_source=codehype_badge",
    src: "https://codehype.ai/badges/realrank.svg?variant=find-us&v=11",
    alt: "Find us on CodeHype",
    width: 380,
    height: 100,
    rel: "noopener noreferrer",
  },
  {
    href: "https://www.founder.best/products/realrank?ref=founderbest",
    src: "https://www.founder.best/api/badge/realrank/light",
    alt: "RealRank - Featured on Founder.best",
    width: 250,
    height: 54,
    rel: "noopener noreferrer",
  },
  {
    href: "https://launchigniter.com/product/real-rank?ref=badge-real-rank",
    src: "https://launchigniter.com/api/badge/real-rank?theme=light",
    alt: "Featured on LaunchIgniter",
    width: 212,
    height: 55,
  },
  {
    href: "https://startupfa.me/s/realrank?utm_source=www.realrank.lol",
    src: "https://startupfa.me/badges/featured-badge.webp",
    alt: "RealRank - Featured on Startup Fame",
    width: 171,
    height: 54,
  },
  {
    href: "https://findalternative.to/real-rank/about?utm_source=badge",
    src: "https://findalternative.to/api/badge/01M3H1FFS8ADR1WPAW378P6PV8.svg?theme=light&variant=hero",
    alt: "Real rank is listed on findalternative.to",
    width: 250,
    height: 54,
    title: "Real rank is listed on findalternative.to",
  },
  {
    href: "https://noonlaunch.com/product/real-rank",
    src: "https://noonlaunch.com/badges/real-rank.svg",
    alt: "Featured on Noonlaunch",
    width: 220,
    height: 60,
    rel: "dofollow",
  },
  {
    href: "https://www.foundrlist.com/product/realrank?utm_source=badge&utm_medium=embed",
    src: "https://www.foundrlist.com/api/badge/realrank",
    alt: "Featured on FoundrList",
    width: 150,
    height: 48,
  },
  {
    href: "https://spacerrapps.com/apps/realrank?utm_source=badge&utm_medium=referral&utm_campaign=featured",
    src: "https://spacerrapps.com/badge/realrank.svg?v=3",
    alt: "RealRank is featured on SpacerrApps",
    width: 234,
    height: 54,
  },
  {
    href: "https://confettisaas.com/saas/realrank-lol?ref=badge",
    src: "https://confettisaas.com/badge-light.svg",
    alt: "RealRank on ConfettiSaaS",
    width: 250,
    height: 54,
  },
  {
    href: "https://swipetolaunch.com/p/realrank?ref=badge",
    src: "https://swipetolaunch.com/api/badge/realrank",
    alt: "Featured on SwipeToLaunch",
    width: 220,
    height: 48,
  },
  {
    href: "https://devhunt.org/tool/realrank",
    src: "https://devhunt.org/badge/realrank.svg",
    alt: "realrank - Featured on DevHunt",
    width: 220,
    height: 54,
    title: "realrank on DevHunt",
  },
  {
    href: "https://wired.business",
    src: "https://wired.business/badge0-white.svg",
    alt: "Featured on Wired Business",
    width: 200,
    height: 54,
  },
  {
    href: "https://easylaunch.dev/marketing/realrank",
    src: "https://easylaunch.dev/badge/easylaunch-badge-light.svg",
    alt: "Featured on EasyLaunch",
    width: 188,
    height: 56,
  },
  {
    href: "https://launchaf.com/",
    src: "https://launchaf.com/api/badge/light?v=launchaf-blue-2026-2",
    alt: "Featured on LaunchAF",
    width: 200,
    height: 56,
    dataAttrs: { "data-launchaf-badge": "true" },
  },
  {
    href: "https://launchstreak.dev/marketing/realrank",
    src: "https://launchstreak.dev/badge/launch-streak-badge-light.svg",
    alt: "Launched on Launch Streak",
    width: 248,
    height: 68,
  },
  {
    href: "https://bricklaun.ch/marketing/real-rank",
    src: "https://bricklaun.ch/badge/brick-launch-badge-a-light.svg",
    alt: "Featured on Brick Launch",
    width: 140,
    height: 54,
  },
  {
    href: "https://lemonlaunch.dev/marketing/realrank",
    src: "https://lemonlaunch.dev/badge/lemonlaunch-badge-light.svg",
    alt: "Featured on LemonLaunch",
    width: 188,
    height: 56,
  },
  {
    href: "https://easydofollow.dev/marketing/realrank",
    src: "https://easydofollow.dev/badge/easydofollow-badge-light.svg",
    alt: "Featured on EasyDoFollow",
    width: 188,
    height: 56,
  },
  {
    href: "https://smollaunch.com",
    src: "https://smollaunch.com/badges/featured.svg",
    alt: "RealRank — Featured on Smol Launch",
    width: 250,
    height: 60,
  },
  {
    href: "https://verifieddr.com/website/realrank-lol",
    src: "https://verifieddr.com/badge/realrank-lol.svg?metric=dr",
    alt: "Verified DR - Verified Domain Rating for realrank.lol",
    width: 220,
    height: 68,
  },
  {
    href: "https://daniellaunches.com",
    src: "https://daniellaunches.com/badge-light.svg",
    alt: "Featured on DanielLaunches",
    width: 220,
    height: 48,
  },
];

function BadgeGroup({
  ariaHidden = false,
  failed,
  onError,
}: {
  ariaHidden?: boolean;
  failed: Set<string>;
  onError: (href: string) => void;
}) {
  return (
    <ul
      className="badge-marquee__group flex shrink-0 items-center gap-8 pr-8"
      aria-hidden={ariaHidden || undefined}
    >
      {BADGES.filter((b) => !failed.has(b.href)).map((b) => (
        <li key={b.href} className="shrink-0">
          <a
            href={b.href}
            title={b.title}
            target={b.plain ? undefined : "_blank"}
            rel={b.plain ? undefined : b.rel ?? "noopener"}
            {...b.dataAttrs}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.src}
              alt={b.alt}
              width={b.width}
              height={b.height}
              className="h-14 w-auto max-w-none opacity-80 transition-opacity hover:opacity-100"
              loading="lazy"
              onError={() => onError(b.href)}
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function BadgeMarquee() {
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const onError = (href: string) =>
    setFailed((prev) => (prev.has(href) ? prev : new Set(prev).add(href)));

  return (
    <section className="border-t border-border/60 py-10">
      <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Featured on
      </p>
      <div className="badge-marquee group relative flex overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />

        <div className="badge-marquee__track flex">
          <BadgeGroup failed={failed} onError={onError} />
          <BadgeGroup ariaHidden failed={failed} onError={onError} />
        </div>
      </div>

      <style>{`
        .badge-marquee__track {
          animation: badge-marquee 28s linear infinite;
        }
        .badge-marquee:hover .badge-marquee__track {
          animation-play-state: paused;
        }
        @keyframes badge-marquee {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .badge-marquee__track { animation: none; }
        }
      `}</style>
    </section>
  );
}
