"use client";

import { useState } from "react";
import { Check, Copy, Download, Linkedin, Share2 } from "lucide-react";

/**
 * "Share your rank" moment. The ranking is the marketing: this turns a site's
 * verified rank into a ready-to-post asset — the branded card image (the same
 * one that unfurls as a link preview), a one-tap X/LinkedIn share, a downloadable
 * PNG to attach directly, and a pre-written caption to copy.
 *
 * `cardImageUrl` is same-origin (the site's opengraph-image), so the fetch +
 * blob download works without CORS. On the real deployment this is a normal
 * browser download.
 */
export function ShareRank({
  cardImageUrl,
  fileName,
  caption,
  xUrl,
  linkedInUrl,
}: {
  cardImageUrl: string;
  fileName: string;
  caption: string;
  xUrl: string;
  linkedInUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  async function downloadCard() {
    setDownloading(true);
    try {
      const res = await fetch(cardImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open the image so the user can save it manually.
      window.open(cardImageUrl, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid gap-0 sm:grid-cols-[1.4fr_1fr]">
        {/* Preview — the actual card that gets shared */}
        <div className="border-b border-border bg-muted/40 p-5 sm:border-b-0 sm:border-r">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardImageUrl}
            alt="Your RealRank card"
            width={1200}
            height={630}
            className="w-full rounded-lg border border-border shadow-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col justify-center gap-2.5 p-5">
          <p className="text-sm text-muted-foreground">
            Verified by Google Search Console. Post it — it&apos;s your proof of
            real growth.
          </p>

          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Share2 className="size-4" /> Share on X
          </a>

          <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Linkedin className="size-4" /> Share on LinkedIn
          </a>

          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={downloadCard}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              <Download className="size-4" /> {downloading ? "…" : "Image"}
            </button>
            <button
              type="button"
              onClick={copyCaption}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              {copied ? (
                <>
                  <Check className="size-4 text-success" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-4" /> Caption
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
