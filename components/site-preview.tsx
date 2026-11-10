"use client";

import { useEffect, useRef, useState } from "react";
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
  priority = false,
}: {
  siteUrl: string;
  host: string;
  name?: string | null;
  className?: string;
  /**
   * Above-the-fold card: load eagerly at high priority and skip the fade-in, so
   * the image can count as the page's LCP the moment it arrives instead of
   * waiting for hydration + onLoad + a 300ms transition.
   */
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // An image that finished (or failed) before hydration never fires React's
  // onLoad/onError, so it would stay invisible forever. Read its state once on
  // mount to catch that case.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return;
    if (img.naturalWidth > 0) setLoaded(true);
    else setFailed(true);
  }, []);

  return (
    <div className={cn("relative overflow-hidden bg-secondary/40", className)}>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/70 to-card">
        <SiteFavicon url={siteUrl} name={name} size={40} className="rounded-lg opacity-80" />
      </div>
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/og-image?host=${encodeURIComponent(host)}`}
          ref={imgRef}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            priority || loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
