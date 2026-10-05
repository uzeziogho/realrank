"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, ArrowRight, Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, siteConfig } from "@/lib/config";
import { track } from "@/lib/track";

type Phase = "form" | "done";

/** The generic badge every lister must embed before listing (links to us). */
const GENERIC_BADGE = `<a href="${siteConfig.url}" target="_blank" rel="noopener">Listed on ${siteConfig.name} →</a>`;

/**
 * The open "$0 listing" form. Listing is free but REQUIRES the RealRank badge
 * on the site: the server fetches the site and only lists it if the badge is
 * present (see createListing). So the form leads with the badge embed, then
 * takes the details. A successful listing is already owner-verified.
 */
export function SubmitForm() {
  const [phase, setPhase] = useState<Phase>("form");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      url: String(fd.get("url") ?? ""),
      name: String(fd.get("name") ?? ""),
      tagline: String(fd.get("tagline") ?? ""),
      description: String(fd.get("description") ?? ""),
      category: String(fd.get("category") ?? ""),
      alternativeTo: String(fd.get("alternativeTo") ?? ""),
      email: String(fd.get("email") ?? ""),
      company: String(fd.get("company") ?? ""), // honeypot
    };
    try {
      const res = await fetch("/api/list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; host?: string | null; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setPending(false);
        return;
      }
      track("listing_created", data.host ?? undefined);
      setHost(data.host ?? "");
      setPhase("done");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setPending(false);
  }

  if (phase === "done") {
    return <ListedSuccess host={host} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1 — the badge is the price of a free listing. It must be live on
          the site before submitting, because the server checks for it. */}
      <div className="rounded-xl border border-border bg-muted/30 p-5">
        <p className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-primary" /> Step 1 — add our badge to your site
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Listing is free in exchange for a link back. Paste this anywhere on your site
          (footer is perfect), publish it, then list below — we check for it before listing.
        </p>
        <CopyField value={GENERIC_BADGE} />
        <p className="mt-2 text-xs text-muted-foreground">
          It renders as: <span className="underline">Listed on {siteConfig.name} →</span>
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="text-sm font-medium">Step 2 — your project</p>

        {/* Honeypot: hidden from users, tempting to bots. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        <Field label="Website URL" hint="The site with the badge on it.">
          <input
            name="url"
            type="text"
            required
            inputMode="url"
            placeholder="yourdomain.com"
            className={inputClass}
          />
        </Field>

        <Field label="Project name">
          <input name="name" type="text" required maxLength={80} placeholder="RealRank" className={inputClass} />
        </Field>

        <Field label="One-line pitch" hint="Shown on the board. Keep it tight.">
          <input
            name="tagline"
            type="text"
            maxLength={120}
            placeholder="The organic-growth leaderboard for real websites."
            className={inputClass}
          />
        </Field>

        <Field label="Category">
          <select name="category" defaultValue="" className={inputClass}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Alternative to" hint="Optional — a tool yours replaces, e.g. Notion.">
          <input
            name="alternativeTo"
            type="text"
            maxLength={60}
            placeholder="Notion"
            className={inputClass}
          />
        </Field>

        <Field label="Description" hint="Optional — a sentence or two.">
          <textarea name="description" maxLength={300} rows={3} className={inputClass} />
        </Field>

        <Field label="Email" hint="Optional — we'll only use it to reach you about this listing.">
          <input name="email" type="email" placeholder="you@company.com" className={inputClass} />
        </Field>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="mt-1">
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Check badge &amp; list — free <ArrowRight className="size-4" />
            </>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Free forever · no account needed · we verify the badge, then you&apos;re listed with a permanent link
        </p>
      </form>
    </div>
  );
}

function ListedSuccess({ host }: { host: string }) {
  const permalink = `${siteConfig.url}/listed/${host}`;
  // Optional upgrade: point the badge at the listing page instead of the root.
  const listingBadge = `<a href="${permalink}" target="_blank" rel="noopener">Listed on ${siteConfig.name} →</a>`;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-success/30 bg-success/10 p-5 text-center">
        <Check className="mx-auto size-7 text-success" />
        <p className="mt-2 text-lg font-semibold">You&apos;re listed &amp; verified.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We found your badge, so {host} is on the board with a verified checkmark and a
          followed link — and a permanent link of its own.
        </p>
      </div>

      {/* Permanent link */}
      <div>
        <p className="text-sm font-medium">Your permanent link</p>
        <CopyField value={permalink} mono />
        <Link href={`/listed/${host}`} className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          View your listing <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Optional: upgrade the badge to point at the listing */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-primary" /> Optional — point your badge at your listing
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep the badge you added (it&apos;s what verified you), or swap it for this version that
          links straight to your {siteConfig.name} listing page.
        </p>
        <CopyField value={listingBadge} />
      </div>

      {/* Upgrade path */}
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/[0.05] p-5 text-center">
        <p className="font-medium">Want a real, ranked spot?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect Google Search Console (read-only) and your verified organic momentum ranks you on the main board.
        </p>
        <Button asChild className="mt-3">
          <Link href="/login" onClick={() => track("connect_click", "listed_success")}>
            Get ranked with Search Console <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** A read-only code value with a copy button. */
function CopyField({ value, mono = false }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }
  return (
    <div className="mt-3 flex items-start gap-2">
      <code
        className={`flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 ${mono ? "truncate text-sm" : "text-xs"}`}
      >
        {value}
      </code>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        {hint && <span className="ml-2 font-normal text-muted-foreground">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
