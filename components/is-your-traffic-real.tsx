"use client";

import Script from "next/script";

/**
 * isyourtrafficreal.com — third-party bot/traffic verification tag. Site key is
 * baked in but overridable via NEXT_PUBLIC_IYTR_KEY; renders nothing if blank,
 * so it's easy to disable.
 */
const IYTR_KEY = process.env.NEXT_PUBLIC_IYTR_KEY || "iytr_19a37c4faa713cdd319fb756";

export function IsYourTrafficReal() {
  if (!IYTR_KEY) return null;
  return (
    <Script
      id="isyourtrafficreal"
      src={`https://isyourtrafficreal.com/t.js?k=${IYTR_KEY}`}
      data-key={IYTR_KEY}
      strategy="afterInteractive"
    />
  );
}
