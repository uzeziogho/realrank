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
    ];
  },
};

export default nextConfig;
