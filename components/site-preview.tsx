"use client";

import { useState } from "react";
import { SiteFavicon } from "@/components/site-favicon";
import { cn } from "@/lib/utils";

/**
 * A listing's preview image: the site's own og:image (via /api/og-image),
 * over a branded placeholder (a subtle gradient with the favicon) that shows
 * while it loads or when no image exists. So a card always looks intentional,
 * never a broken image. Client component for the load/error handling.
 */
export function SitePreview({
  siteUrl,
  host,
  name,
  className,
}: {
  siteUrl: string;
  host: string;
  name?: string | null;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-secondary/40", className)}>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/70 to-card">
        <SiteFavicon url={siteUrl} name={name} size={40} className="rounded-lg opacity-80" />
      </div>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/og-image?host=${encodeURIComponent(host)}`}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
