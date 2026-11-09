"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/copy-field";
import {
  categories,
  PRICING_OPTIONS,
  PLATFORM_OPTIONS,
  PRICING_LABELS,
  PLATFORM_LABELS,
} from "@/lib/config";
import { cn } from "@/lib/utils";
import { track } from "@/lib/track";
import type { Listing } from "@/lib/listed";

const DESC_MIN = 100;

const inputClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2";
const textareaClass =
  "w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus-visible:ring-2";

/**
 * Claim-and-edit for a directory listing. A non-owner proves control of the
 * domain by placing a one-time code on the site (claim flow); the verified owner
 * gets the edit form. Both talk to /api/list/claim*, /api/list/edit — the server
 * enforces ownership, so nothing here can grant edit rights on its own.
 */
export function ClaimEdit({ listing, isOwner }: { listing: Listing; isOwner: boolean }) {
  if (isOwner) return <EditForm listing={listing} />;
  return <ClaimFlow host={listing.host} />;
}

function ClaimFlow({ host }: { host: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    setError(null);
    setRequesting(true);
    try {
      const res = await fetch("/api/list/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ host }),
      });
      const data = (await res.json()) as { ok: boolean; code?: string; alreadyOwner?: boolean; error?: string };
      if (data.ok && data.alreadyOwner) {
        window.location.reload();
        return;
      }
      if (data.ok && data.code) {
        track("claim_start", host);
        setCode(data.code);
      }
      else setError(data.error ?? "Couldn't start the claim.");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setRequesting(false);
  }

  async function verify() {
    setError(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/list/claim/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ host }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        track("claim_verified", host);
        window.location.reload(); // re-render as owner → edit form
        return;
      }
      setError(data.error ?? "Couldn't verify yet.");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setVerifying(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="flex items-center gap-2 font-medium">
        <ShieldCheck className="size-4 text-primary" /> Verify you own {host}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        To edit this listing, prove you control the site: add a one-time code to your homepage, then verify.
        It stays private and you can remove it afterwards.
      </p>

      {!code ? (
        <div className="mt-4">
          <Button type="button" onClick={requestCode} disabled={requesting}>
            {requesting ? <Loader2 className="size-4 animate-spin" /> : "Get my verification code"}
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">1. Add this code anywhere on {host}</p>
            <p className="mb-2 text-xs text-muted-foreground">
              A comment, a hidden element, or visible text all work — it just has to appear in the page&apos;s HTML.
            </p>
            <CopyField value={code} mono event="claim_code_copy" />
          </div>
          <div>
            <p className="text-sm font-medium">2. Then verify</p>
            <Button type="button" onClick={verify} disabled={verifying} className="mt-2">
              {verifying ? <Loader2 className="size-4 animate-spin" /> : "I've added it — verify"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}

function EditForm({ listing }: { listing: Listing }) {
  const [desc, setDesc] = useState(listing.description ?? "");
  const [platforms, setPlatforms] = useState<string[]>(listing.platforms ?? []);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePlatform(p: string) {
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      host: listing.host,
      displayName: String(fd.get("name") ?? ""),
      tagline: String(fd.get("tagline") ?? ""),
      description: String(fd.get("description") ?? ""),
      category: String(fd.get("category") ?? ""),
      alternativeTo: String(fd.get("alternativeTo") ?? ""),
      pricing: String(fd.get("pricing") ?? ""),
      platforms,
      details: String(fd.get("details") ?? ""),
    };
    try {
      const res = await fetch("/api/list/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        track("listing_edited");
        setSaved(true);
      }
      else setError(data.error ?? "Couldn't save your changes.");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Project name">
        <input name="name" type="text" required maxLength={80} defaultValue={listing.displayName} className={inputClass} />
      </Field>

      <Field label="One-line pitch" hint="Shown on the board.">
        <input name="tagline" type="text" maxLength={120} defaultValue={listing.tagline ?? ""} className={inputClass} />
      </Field>

      <Field label="Description" hint="What it does, who it's for, and one thing that makes it different.">
        <textarea
          name="description"
          required
          minLength={DESC_MIN}
          maxLength={400}
          rows={4}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className={textareaClass}
        />
        <span className={cn("self-end text-xs tabular-nums", desc.trim().length >= DESC_MIN ? "text-success" : "text-muted-foreground")}>
          {desc.trim().length}/{DESC_MIN} min
        </span>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select name="category" defaultValue={listing.category ?? ""} className={inputClass}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Pricing">
          <select name="pricing" defaultValue={listing.pricing ?? ""} className={inputClass}>
            <option value="">Not specified</option>
            {PRICING_OPTIONS.map((p) => (
              <option key={p} value={p}>{PRICING_LABELS[p]}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Platforms" hint="Where it runs.">
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((p) => {
            const on = platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  on ? "border-primary bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {PLATFORM_LABELS[p]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Alternative to" hint="A tool yours replaces, e.g. Notion.">
        <input name="alternativeTo" type="text" maxLength={60} defaultValue={listing.alternativeTo ?? ""} className={inputClass} />
      </Field>

      <Field label="Details" hint="Key features, integrations, anything else buyers should know.">
        <textarea name="details" maxLength={1000} rows={5} defaultValue={listing.details ?? ""} className={textareaClass} />
      </Field>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
      {saved && (
        <p className="inline-flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <Check className="size-4" /> Saved.{" "}
          <Link href={`/listed/${listing.host}`} className="inline-flex items-center gap-1 font-medium underline">
            View your listing <ArrowRight className="size-3.5" />
          </Link>
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1 self-start">
        {pending ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
      </Button>
    </form>
  );
}

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
