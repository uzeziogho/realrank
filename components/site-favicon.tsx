"use client";

import { useState } from "react";
import { cn, hostname } from "@/lib/utils";

/**
 * A site's favicon with a graceful monogram fallback. Loads the icon from
 * Google's public favicon service; if it hasn't loaded (or fails), a colored
 * first-letter tile shows instead — so a row never renders a broken image.
 * Client component (needs onLoad/onError), but a tiny leaf: it doesn't force
 * the surrounding leaderboard to render dynamically.
 */
export function SiteFavicon({
  url,
  name,
  size = 20,
  className,
}: {
  url: string;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const host = hostname(url);
  const src = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`;
  const letter = ((name?.trim()?.[0] ?? host[0]) || "?").toUpperCase();

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-muted text-[10px] font-semibold text-muted-foreground",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {(!loaded || failed) && <span aria-hidden>{letter}</span>}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </span>
  );
}
