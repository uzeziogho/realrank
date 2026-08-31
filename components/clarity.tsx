"use client";

import Script from "next/script";

/**
 * Microsoft Clarity — free heatmaps + session recordings.
 * Project id is baked in but overridable via NEXT_PUBLIC_CLARITY_ID; renders
 * nothing if the id is blank, so it's easy to disable.
 */
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "yb62px4o53";

export function Clarity() {
  if (!CLARITY_ID) return null;
  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_ID}");`}
    </Script>
  );
}
