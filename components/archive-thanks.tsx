"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Post-checkout banner for /archive. The payment link redirects buyers back with
 * ?founding=success, so they land on a thank-you rather than the sales pitch.
 * If the checkout appends a non-success `status` (failed / cancelled), say so
 * plainly instead of thanking them for a payment that didn't happen.
 */
export function ArchiveThanks({ supportEmail }: { supportEmail: string }) {
  const params = useSearchParams();
  if (params.get("founding") !== "success") return null;

  const status = (params.get("status") ?? "").toLowerCase();
  const failed = status !== "" && status !== "succeeded" && status !== "success";

  if (failed) {
    return (
      <div role="alert" className="container max-w-3xl pt-8">
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
          <p>
            <span className="font-semibold">Your payment didn&apos;t go through.</span> No charge was made — you can
            try again below, or email <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div role="status" className="container max-w-3xl pt-8">
      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        <p>
          <span className="font-semibold">You&apos;re a founding member — thank you!</span> Your receipt is on its way
          by email. We&apos;ll email you the moment your archive is ready. Questions? <a className="underline" href={`mailto:${supportEmail}`}>{supportEmail}</a>
        </p>
      </div>
    </div>
  );
}
