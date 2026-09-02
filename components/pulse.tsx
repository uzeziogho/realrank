"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires the first-party traffic beacon on each page view (initial load and
 * client-side navigations). Fire-and-forget; failures are swallowed so
 * analytics can never affect the page. The server decides new visitor/session
 * from cookies (see /api/pulse).
 */
export function Pulse() {
  const pathname = usePathname();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/pulse", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      signal: controller.signal,
    }).catch(() => {
      /* ignore — never break the page */
    });
    return () => controller.abort();
  }, [pathname]);

  return null;
}
