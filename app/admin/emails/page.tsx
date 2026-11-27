import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { comebackStatus, runComeback, getEmailReturns, LISTING_VISITS_FLOOR, type DraftKind } from "@/lib/comeback";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Comeback emails",
  robots: { index: false, follow: false },
};

const KIND_LABEL: Record<DraftKind, string> = {
  owner_weekly: "Weekly report (owner)",
  owner_alert: "Rank alert (owner)",
  listing_weekly: "Visits report (listing)",
};

async function recentSends() {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data } = await createServiceClient()
      .from("email_log")
      .select("kind, recipient, period, sent_at")
      .order("sent_at", { ascending: false })
      .limit(30);
    return data ?? [];
  } catch {
    return [];
  }
}

/**
 * Owner-only preview of the comeback emails: what Monday's run would send
 * (as of now, with today's data), plus what has actually gone out. A dry run —
 * opening this page never sends or records anything.
 */
export default async function AdminEmailsPage() {
  await requireAdmin("/admin/emails");
  const status = comebackStatus();
  const [preview, sends, returns] = await Promise.all([
    runComeback({ dryRun: true, forceWeekly: true }),
    recentSends(),
    getEmailReturns(30),
  ]);
  const totalSent = returns.rows.reduce((n, r) => n + r.sent, 0);
  const totalVisits = returns.rows.reduce((n, r) => n + r.visits, 0);
  const counts = preview.drafts.reduce(
    (m, d) => ({ ...m, [d.kind]: (m[d.kind] ?? 0) + 1 }),
    {} as Partial<Record<DraftKind, number>>,
  );

  return (
    <AdminShell>
      <div className="max-w-3xl">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Comeback emails</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Weekly reports and visits reports go out on Mondays; rank alerts any day, after the 06:00 refresh. This page is a
        preview — opening it never sends anything.
      </p>

      <section
        className={cn(
          "mt-6 rounded-xl border p-4 text-sm",
          status.enabled ? "border-success/30 bg-success/10" : "border-amber-500/40 bg-amber-500/[0.08]",
        )}
      >
        {status.enabled ? (
          <p>
            <span className="font-semibold">Sending is on.</span> The next run is tomorrow at 07:50 UTC.
          </p>
        ) : (
          <>
            <p className="font-semibold">Sending is off — {status.reason}.</p>
            <p className="mt-1 text-muted-foreground">
              Read the drafts below, then set <code>COMEBACK_EMAILS_ENABLED=true</code> in Vercel and redeploy.
            </p>
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Returns · last {returns.days} days</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Visits that came back through a link in each email. Every link is tagged (for example{" "}
          <code>utm_source=email-weekly</code>), so these also appear as sources in your dashboard&apos;s Analytics.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[440px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-right font-medium">Sent</th>
                <th className="px-4 py-2 text-right font-medium">Visits back</th>
                <th className="px-4 py-2 text-right font-medium">Visits per email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {returns.rows.map((r) => (
                <tr key={r.kind}>
                  <td className="px-4 py-2">{KIND_LABEL[r.kind]}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.sent}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.visits}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.sent > 0 ? (r.visits / r.sent).toFixed(2) : "—"}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right tabular-nums">{totalSent}</td>
                <td className="px-4 py-2 text-right tabular-nums">{totalVisits}</td>
                <td className="px-4 py-2 text-right tabular-nums">{totalSent > 0 ? (totalVisits / totalSent).toFixed(2) : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Counts clicks, not opens (open tracking is unreliable and intrusive), and visits rather than unique people.
          {!returns.available && " Couldn't read the numbers right now."}
        </p>
      </section>

      {preview.skipped && (
        <p className="mt-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{preview.skipped}</p>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">The designs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The weekly report and the &ldquo;#1&rdquo; alert are designed (React Email), with example data here. Every email
          also carries a plain-text version, and the other alerts stay plain text.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[
            ["weekly", "Weekly report"],
            ["top", "“#1” alert"],
          ].map(([key, label]) => (
            <figure key={key} className="overflow-hidden rounded-xl border border-border bg-card">
              <figcaption className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">{label} · example</figcaption>
              <iframe
                src={`/admin/emails/preview?sample=${key}`}
                title={`${label} example`}
                sandbox=""
                loading="lazy"
                className="h-[640px] w-full bg-white"
              />
            </figure>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">If Monday&apos;s run happened now</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts.owner_weekly ?? 0} weekly reports · {counts.owner_alert ?? 0} rank alerts ·{" "}
          {counts.listing_weekly ?? 0} visits reports (listings with {LISTING_VISITS_FLOOR}+ visits this week)
          {preview.baselined > 0 && (
            <> · {preview.baselined} sites seen for the first time (their baseline is recorded on the first real run; no alert)</>
          )}
        </p>
        {preview.drafts.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing would go out right now.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {preview.drafts.slice(0, 15).map((d, i) => (
              <details key={i} className="rounded-xl border border-border bg-card" open={i === 0}>
                <summary className="cursor-pointer list-none p-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-primary">{KIND_LABEL[d.kind]}</span>
                  <span className="mt-1 block font-medium">{d.subject}</span>
                  <span className="text-xs text-muted-foreground">to {d.to}</span>
                </summary>
                {d.designed && (
                  <iframe
                    src={`/admin/emails/preview?kind=${d.kind}&to=${encodeURIComponent(d.to)}`}
                    title={`Designed version: ${d.subject}`}
                    sandbox=""
                    loading="lazy"
                    className="h-[640px] w-full border-t border-border bg-white"
                  />
                )}
                <pre className="overflow-x-auto whitespace-pre-wrap border-t border-border p-4 font-sans text-sm text-muted-foreground">
                  {d.designed && <span className="mb-2 block text-xs font-medium uppercase tracking-wide">Plain-text version</span>}
                  {d.text}
                </pre>
              </details>
            ))}
            {preview.drafts.length > 15 && (
              <p className="text-center text-xs text-muted-foreground">…and {preview.drafts.length - 15} more.</p>
            )}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recently sent</h2>
        {sends.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card text-sm">
            {sends.map((s, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                <span>
                  {KIND_LABEL[s.kind as DraftKind] ?? s.kind} · <span className="text-muted-foreground">{s.recipient}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
    </AdminShell>
  );
}
