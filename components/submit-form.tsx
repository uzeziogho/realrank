"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, ArrowRight, Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, siteConfig } from "@/lib/config";
import { track } from "@/lib/track";

type Phase = "form" | "done";

/**
 * The open "$0 listing" form. Posts to /api/list (spam guards + honeypot live
 * server-side). On success it shows the permanent link and the badge embed, then
 * lets the owner prove ownership (POST /api/list/verify) to earn a dofollow
 * verified checkmark — short of connecting Search Console for a full ranked spot.
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Honeypot: hidden from users, tempting to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <Field label="Website URL" hint="The site you want listed.">
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

      <Field label="Description" hint="Optional — a sentence or two.">
        <textarea name="description" maxLength={300} rows={3} className={inputClass} />
      </Field>

      <Field label="Email" hint="Optional — so we can tell you when you rank.">
        <input name="email" type="email" placeholder="you@company.com" className={inputClass} />
      </Field>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <>List my project — free <ArrowRight className="size-4" /></>}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Free forever · no account needed · you get a permanent link
      </p>
    </form>
  );
}

function ListedSuccess({ host }: { host: string }) {
  const permalink = `${siteConfig.url}/listed/${host}`;
  const badge = `<a href="${permalink}" target="_blank" rel="noopener">Listed on ${siteConfig.name} →</a>`;

  const [copied, setCopied] = useState<"link" | "badge" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function copy(text: string, which: "link" | "badge") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  async function verify() {
    setVerifyError(null);
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
        setVerifyError(data.error ?? "Couldn't verify yet.");
      }
    } catch {
      setVerifyError("Couldn't reach the server. Please try again.");
    }
    setVerifying(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-success/30 bg-success/10 p-5 text-center">
        <Check className="mx-auto size-7 text-success" />
        <p className="mt-2 text-lg font-semibold">You&apos;re listed.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {host} is on the board with a permanent link.
        </p>
      </div>

      {/* Permanent link */}
      <div>
        <p className="text-sm font-medium">Your permanent link</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded-md border border-border bg-muted px-3 py-2 text-sm">{permalink}</code>
          <Button type="button" variant="outline" size="sm" onClick={() => copy(permalink, "link")}>
            {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <Link href={`/listed/${host}`} className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          View your listing <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Badge → verify ownership */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 font-medium">
          <ShieldCheck className="size-4 text-primary" /> Get a verified checkmark
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add this badge to your site, then verify. We&apos;ll confirm it&apos;s really yours and mark
          your listing verified (a followed link).
        </p>
        <div className="mt-3 flex items-start gap-2">
          <code className="flex-1 overflow-x-auto rounded-md border border-border bg-muted px-3 py-2 text-xs">{badge}</code>
          <Button type="button" variant="outline" size="sm" onClick={() => copy(badge, "badge")}>
            {copied === "badge" ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>

        {verified ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-success">
            <Check className="size-4" /> Verified — your listing shows a checkmark.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <Button type="button" onClick={verify} disabled={verifying} className="self-start">
              {verifying ? <Loader2 className="size-4 animate-spin" /> : "I've added the badge — verify"}
            </Button>
            {verifyError && <p className="text-sm text-danger">{verifyError}</p>}
          </div>
        )}
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
