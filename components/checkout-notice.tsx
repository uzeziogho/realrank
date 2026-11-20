"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * The "payment received / didn't go through" note after a Spotlight checkout
 * (?spotlight=success&status=…). Read in the browser so the listing page
 * itself stays cacheable — reading searchParams on the server would render
 * every listing fresh on every visit.
 */
export function CheckoutNotice({
  displayName,
  live,
  queued,
  until,
  startsAt,
  days,
  supportEmail,
}: {
  displayName: string;
  live: boolean;
  queued: boolean;
  until: string | null;
  startsAt: string | null;
  days: number;
  supportEmail: string;
}) {
  const sp = useSearchParams();
  if (sp.get("spotlight") !== "success") return null;
  const status = (sp.get("status") ?? "").toLowerCase();
  const failed = status !== "" && status !== "succeeded" && status !== "success";
  const short = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

  if (failed) {
    return (
      <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger" />
        <p>
          <span className="font-semibold">Your payment didn&apos;t go through.</span> No charge was made — you can try
          again from the Spotlight section below.
        </p>
      </div>
    );
  }
  return (
    <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
      <p>
        <span className="font-semibold">Payment received — thank you!</span>{" "}
        {live && until
          ? `${displayName} is spotlighted until ${short(until)}.`
          : queued && startsAt
            ? `Every slot was taken, so your ${days} days start ${short(startsAt)}.`
            : `Your ${days}-day Spotlight starts within a minute — refresh to see it.`}{" "}
        Questions?{" "}
        <a className="underline" href={`mailto:${supportEmail}`}>
          {supportEmail}
        </a>
      </p>
    </div>
  );
}
