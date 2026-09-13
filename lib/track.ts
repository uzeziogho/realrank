/**
 * Fire-and-forget product-analytics event (Umami-style). Records a named
 * feature-usage event against the first-party /api/event beacon. Aggregate and
 * privacy-safe — no PII. Never throws, never blocks the UI.
 *
 *   track("report_card");
 *   track("connect_click", "home");
 */
export function track(event: string, label?: string): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({ event, label: label ?? "" });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/event", {
      method: "POST",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body,
    }).catch(() => {});
  } catch {
    /* analytics must never break the page */
  }
}
