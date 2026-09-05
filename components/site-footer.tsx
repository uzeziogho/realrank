import Link from "next/link";
import { siteConfig, categories, guideLinks } from "@/lib/config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="container flex flex-col gap-8 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <p className="font-semibold">{siteConfig.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{siteConfig.tagline}</p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
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
              <li><Link href="/organic-growth-grade" className="hover:text-foreground">Growth grader</Link></li>
              <li><Link href="/is-my-traffic-real" className="hover:text-foreground">Is my traffic real?</Link></li>
              <li><Link href="/stats" className="hover:text-foreground">Stats</Link></li>
              <li><Link href="/dashboard/channels" className="hover:text-foreground">Channels</Link></li>
              <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
              <li><Link href="/about" className="hover:text-foreground">How it works</Link></li>
              <li><Link href="/login" className="hover:text-foreground">Connect Search Console</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium">Guides</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {guideLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li><Link href="/blog/introducing-channels" className="hover:text-foreground">Channels: intro</Link></li>
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
      <div className="container mt-8 border-t border-border/60 pt-6 text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. Rankings from verified Google Search Console data.
        </p>
      </div>
    </footer>
  );
}
