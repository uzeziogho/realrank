import Link from "next/link";
import { siteConfig, categories } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container flex flex-col gap-8 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <p className="font-semibold">{siteConfig.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{siteConfig.tagline}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-medium">Categories</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} className="hover:text-foreground">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/#leaderboard" className="hover:text-foreground">Leaderboard</Link></li>
              <li><Link href="/movers" className="hover:text-foreground">Movers &amp; Shakers</Link></li>
              <li><Link href="/founding" className="hover:text-foreground">Founding sites</Link></li>
              <li><Link href="/momentum-score" className="hover:text-foreground">Momentum calculator</Link></li>
              <li><Link href="/stats" className="hover:text-foreground">Stats</Link></li>
              <li><Link href="/blog/introducing-channels" className="hover:text-foreground">Channels</Link></li>
              <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
              <li><Link href="/about" className="hover:text-foreground">How it works</Link></li>
              <li><Link href="/login" className="hover:text-foreground">Connect Search Console</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Legal</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="container mt-8 flex flex-col items-start gap-4 border-t border-border/60 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. Rankings from verified Google Search Console data.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {/* tinyshelf badge — anchor kept exactly as required by their checker
              (landing-page href with ?ref, no rel). eslint-disable-next-line @next/next/no-img-element */}
          <a href="https://www.tinyshelf.co/?ref=realrank.lol" title="Featured on tinyshelf">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://www.tinyshelf.co/badge/tinyshelf-badge-dark-f4d1216a.svg"
              alt="Featured on tinyshelf"
              width={216}
              height={64}
            />
          </a>
          <a
            href="https://marketingdb.live"
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://marketingdb.live/badge-light.svg"
              alt="Listed on MarketingDB"
              width={190}
              height={44}
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
