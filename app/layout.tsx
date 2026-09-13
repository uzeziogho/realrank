import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { siteConfig } from "@/lib/config";
import { WebsiteJsonLd, OrganizationJsonLd } from "@/components/json-ld";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Analytics } from "@vercel/analytics/next";
import { Clarity } from "@/components/clarity";
import { Pulse } from "@/components/pulse";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — The Organic Traffic Leaderboard`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "organic traffic leaderboard",
    "website traffic ranking",
    "SEO leaderboard",
    "organic clicks",
    "Google Search Console ranking",
    "fastest growing websites",
  ],
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo-120.png", type: "image/png", sizes: "120x120" },
    ],
    shortcut: "/logo-120.png",
    apple: "/logo-120.png",
  },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: `${siteConfig.name} — The Organic Traffic Leaderboard`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    // Image comes from app/opengraph-image.tsx (generated) — no static file needed.
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — The Organic Traffic Leaderboard`,
    description: siteConfig.description,
    creator: siteConfig.twitter,
    // Image comes from app/twitter-image.tsx (generated).
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  // Renders <meta name="google-site-verification"> only when a token is set
  // (via lib/config or the GOOGLE_SITE_VERIFICATION env var).
  ...(siteConfig.googleSiteVerification
    ? { verification: { google: siteConfig.googleSiteVerification } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        {/* Brand wordmark typeface (Space Grotesk). Loaded via stylesheet so it
            works without a build-time font fetch; the Logo falls back to the
            site sans until it arrives. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap"
          rel="stylesheet"
        />
        {/* Set theme before paint to avoid a flash. Follows the visitor's saved
            choice, else their system preference (dark is the design default). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var c=document.documentElement.classList;c.toggle('dark',d);c.toggle('light',!d);}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <WebsiteJsonLd />
        <OrganizationJsonLd />
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
        <Analytics />
        <Clarity />
        <Pulse />
      </body>
    </html>
  );
}
