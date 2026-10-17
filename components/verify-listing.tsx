"use client";

import { useState } from "react";
import { Loader2, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/copy-field";
import { siteConfig } from "@/lib/config";
import { track } from "@/lib/track";

/**
 * Badge snippet + "verify" for an unverified listing.
 *
 * Verifying means adding the badge to your own site first, which means leaving
 * whatever page you were on and shipping a change. So this lives on the listing
 * page as well as the submit success screen: the owner needs to find it again
 * when they come back, and a listing has no account to log in to. Everything it
 * needs is the host, which is already in the URL, and the check itself is
 * server-side (POST /api/list/verify fetches the site and looks for the badge),
 * so nothing here can grant a checkmark to someone who hasn't earned it.
 */
export function VerifyListing({ host }: { host: string }) {
  const permalink = `${siteConfig.url}/listed/${host}`;
  const badge = `<a href="${permalink}" target="_blank" rel="noopener">Listed on ${siteConfig.name} →</a>`;

  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setError(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/list/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ host }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        track("listing_verified", host);
        setVerified(true);
      } else {
        setError(data.error ?? "Couldn't verify yet.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setVerifying(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 font-medium">
        <ShieldCheck className="size-4 text-primary" /> Get a verified checkmark
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Own {host}? Add this badge to your site, then verify. We&apos;ll confirm it&apos;s really
        yours and mark your listing verified (a followed link).
      </p>
      <CopyField value={badge} />

      {verified ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-success">
          <Check className="size-4" /> Verified — your listing shows a checkmark.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" onClick={verify} disabled={verifying} className="self-start">
            {verifying ? <Loader2 className="size-4 animate-spin" /> : "I've added the badge — verify"}
          </Button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
