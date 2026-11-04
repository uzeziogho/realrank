// Twitter/X uses the same tailored listing card as Open Graph. The route
// config must be declared locally (Next can't read re-exported config fields),
// and it must stay "nodejs" — the renderer uses Buffer for the favicon.
import { siteConfig } from "@/lib/config";

export { default } from "./opengraph-image";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteConfig.name} listing card`;
