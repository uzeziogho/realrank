/**
 * "Featured on" badge bar — a continuous left-to-right marquee of third-party
 * feature badges. External badge images are rendered with a plain <img> (same
 * as the footer badges) since they're hosted on the partners' domains. Pauses
 * on hover and respects prefers-reduced-motion.
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
}

const BADGES: Badge[] = [
  {
    href: "https://startuptrusted.com?ref=realrank.lol",
    src: "https://startuptrusted.com/api/badge?type=featured&style=light",
    alt: "RealRank on StartupTrusted",
    width: 240,
    height: 54,
  },
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
];

function BadgeGroup({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <ul
      className="badge-marquee__group flex shrink-0 items-center gap-8 pr-8"
      aria-hidden={ariaHidden || undefined}
    >
      {BADGES.map((b) => (
        <li key={b.href} className="shrink-0">
          <a
            href={b.href}
            title={b.title}
            target={b.plain ? undefined : "_blank"}
            rel={b.plain ? undefined : b.rel ?? "noopener"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.src}
              alt={b.alt}
              width={b.width}
              height={b.height}
              className="h-14 w-auto max-w-none opacity-80 transition-opacity hover:opacity-100"
              loading="lazy"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function BadgeMarquee() {
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
          <BadgeGroup />
          <BadgeGroup ariaHidden />
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
