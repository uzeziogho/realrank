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
              {categories.slice(0, 5).map((c) => (
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
              <li><Link href="/about" className="hover:text-foreground">How it works</Link></li>
              <li><Link href="/stats" className="hover:text-foreground">Stats</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground">Add your site</Link></li>
              <li><Link href="/#leaderboard" className="hover:text-foreground">Leaderboard</Link></li>
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
        © {new Date().getFullYear()} {siteConfig.name}. Rankings from verified Google Search Console data.
      </div>
    </footer>
  );
}
