import Link from "next/link";
import { Bell, ArrowRight, AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { markNotificationsReadAction } from "@/app/admin/placements/actions";
import type { AdminNotification } from "@/lib/supabase/types";

const when = (iso: string) => {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

/** The bell in the dashboard header: unread count, links to the admin card below. */
export function AdminBell({ unread }: { unread: number }) {
  return (
    <a
      href="#admin"
      aria-label={unread ? `${unread} unread admin notification${unread === 1 ? "" : "s"}` : "Admin notifications"}
      className="relative inline-flex size-9 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-muted"
    >
      <Bell className="size-4" />
      {unread > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-semibold leading-5 text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </a>
  );
}

/**
 * Admin-only card at the top of the dashboard: the latest notifications (new
 * sponsors, payments that need a person, setup problems) and the way into
 * /admin/placements. Visible only to ADMIN_EMAILS / OWNER_EMAIL accounts.
 */
export function AdminPanel({
  items,
  unread,
  available,
  setupProblems,
  growth = null,
}: {
  items: AdminNotification[];
  unread: number;
  available: boolean;
  setupProblems: number;
  /** New signups in the last 7 days (null when the database can't be read). */
  growth?: { listings: number; sites: number; accounts: number } | null;
}) {
  const latest = items.slice(0, 4);
  return (
    <section id="admin" className="mt-6 scroll-mt-24 rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 font-semibold">
          <Bell className="size-4 text-primary" /> Admin
          {unread > 0 && (
            <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">{unread} new</span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {unread > 0 && (
            <form action={markNotificationsReadAction}>
              <button className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted">
                Mark all read
              </button>
            </form>
          )}
          <Link
            href="/admin/emails"
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
          >
            Emails
          </Link>
          <Link
            href="/admin/placements"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Paid placements <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

      {growth && (
        <Link
          href="/dashboard/analytics#growth"
          className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm hover:border-primary/40"
        >
          <span className="inline-flex items-center gap-1.5 font-medium">
            <TrendingUp className="size-4 text-primary" /> Last 7 days
          </span>
          <span className="tabular-nums">
            <span className="font-semibold">{growth.listings}</span> listing{growth.listings === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums">
            <span className="font-semibold">{growth.sites}</span> verified site{growth.sites === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums">
            <span className="font-semibold">{growth.accounts}</span> account{growth.accounts === 1 ? "" : "s"}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-primary">
            Growth <ArrowRight className="size-3.5" />
          </span>
        </Link>
      )}

      {setupProblems > 0 && (
        <Link
          href="/admin/placements"
          className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.08] p-3 text-sm hover:bg-amber-500/[0.12]"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
          <span>
            <span className="font-medium">
              {setupProblems} setup item{setupProblems === 1 ? "" : "s"} need attention
            </span>{" "}
            — payments may not activate until they&apos;re fixed. See the setup check →
          </span>
        </Link>
      )}

      {!available ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Notifications start once migration 20261116 is applied in Supabase.
        </p>
      ) : latest.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No notifications yet. New sponsors and payments that need you will show here.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60 rounded-lg border border-border bg-card text-sm">
          {latest.map((n) => (
            <li key={n.id} className={cn("flex items-start gap-2 p-3", !n.read_at && "bg-primary/[0.04]")}>
              <span
                className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : n.kind === "money" ? "bg-success" : n.kind === "warning" ? "bg-amber-500" : "bg-primary")}
                aria-hidden="true"
              />
              <Link href={n.link ?? "/admin/placements"} className="min-w-0 flex-1 hover:underline">
                <span className="font-medium">{n.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">{when(n.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
