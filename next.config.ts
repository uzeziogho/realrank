import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async redirects() {
    return [
      // Consolidated the two manual "grade from your clicks" tools into one.
      // The growth grader's letter grade now lives in the momentum calculator.
      { source: "/organic-growth-grade", destination: "/momentum-score", permanent: true },
      // The old standalone SaaS page ranked for the generic "fastest growing
      // websites" query, so it consolidates into the all-categories hub (which
      // links on to the SaaS page) rather than the narrower SaaS-only page.
      { source: "/best/fastest-growing-saas-websites", destination: "/best/fastest-growing", permanent: true },
    ];
  },
};

export default nextConfig;
