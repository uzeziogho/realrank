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
    // Headless automation (Playwright, Puppeteer, Selenium) sets this flag and
    // usually sends an ordinary-looking user agent, so the server's UA filter
    // never catches it. Clarity flags that traffic behaviourally — this is the
    // cheap half of the same job, and it keeps the public session/visitor
    // counters closer to real humans.
    if (typeof navigator !== "undefined" && navigator.webdriver) return;

    const controller = new AbortController();
    // Send the page path, referrer, and utm_source so the server can attribute
    // the visit (source / landing page / country / device). No PII.
    let payload = "{}";
    try {
      payload = JSON.stringify({
        path: window.location.pathname,
        ref: document.referrer || "",
        src: new URLSearchParams(window.location.search).get("utm_source") || "",
      });
    } catch {
      /* fall back to empty body */
    }
    fetch("/api/pulse", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: payload,
      signal: controller.signal,
    }).catch(() => {
      /* ignore — never break the page */
    });
    return () => controller.abort();
  }, [pathname]);

  return null;
}
