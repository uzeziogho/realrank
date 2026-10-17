"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Check, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/copy-field";
import { VerifyListing } from "@/components/verify-listing";
import { categories, siteConfig } from "@/lib/config";
import { track } from "@/lib/track";

type Phase = "form" | "done";

/**
 * The open "$0 listing" form. Posts to /api/list (spam guards + honeypot live
 * server-side). Listing is free and does not require the badge; on success it
 * shows the permanent link and the badge/verify panel (<VerifyListing />),
 * which earns a dofollow verified checkmark — short of connecting Search
 * Console for a full ranked spot. That panel also lives on /listed/<host>,
 * because adding the badge means leaving this page and shipping a change.
 */
export function SubmitForm() {
  const [phase, setPhase] = useState<Phase>("form");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState<string>("");
  // Only URL + name + pitch show up front; the rest (all optional) stay tucked
  // behind a toggle so the form reads as a 30-second task, not a 7-field wall.
  const [showMore, setShowMore] = useState(false);

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

      {/* Everything below is optional. Hidden by default so the form stays
          short; inputs stay mounted (hidden) so their values still submit. */}
      <div className={showMore ? "flex flex-col gap-4" : "hidden"}>
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

        <Field label="Alternative to" hint="A tool yours replaces, e.g. Notion.">
          <input
            name="alternativeTo"
            type="text"
            maxLength={60}
            placeholder="Notion"
            className={inputClass}
          />
        </Field>

        <Field label="Description" hint="A sentence or two.">
          <textarea name="description" maxLength={300} rows={3} className={inputClass} />
        </Field>

        <Field label="Email" hint="We'll only use it to reach you about this listing.">
          <input name="email" type="email" placeholder="you@company.com" className={inputClass} />
        </Field>
      </div>

      {!showMore && (
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown className="size-4" />
          Add category, description &amp; more{" "}
          <span className="font-normal text-muted-foreground/70">(optional)</span>
        </button>
      )}

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
        <CopyField value={permalink} mono />
        <Link href={`/listed/${host}`} className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
          View your listing <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Badge → verify ownership (optional). The same panel the listing page
          shows, so an owner who comes back later finds it in both places. */}
      <VerifyListing host={host} />

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
