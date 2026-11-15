import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { getPlacementsOverview, freeSponsorPositions, type AdminSponsor, type AdminSpotlight } from "@/lib/placements";
import { getNotifications, getRecentWebhookEvents, getSetupCheck } from "@/lib/admin-log";
import { SPONSOR } from "@/lib/sponsor";
import { SPOTLIGHT } from "@/lib/spotlight";
import { cn } from "@/lib/utils";
import {
  createSlotAction,
  endSpotlightAction,
  grantSpotlightAction,
  markNotificationsReadAction,
  saveSlotAction,
  setSlotStateAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paid placements",
  robots: { index: false, follow: false },
};

const fmt = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "—";

function spotlightState(s: AdminSpotlight, now: number): "live" | "queued" | "ended" {
  const end = Date.parse(s.until);
  const start = s.start ? Date.parse(s.start) : end;
  if (end <= now) return "ended";
  return start > now ? "queued" : "live";
}

/**
 * The owner's view of everything paid: every Spotlight run (live, queued,
 * recently ended) with its payments, and every sponsor slot with its billing.
 * Each row has the actions a person might need — end, extend, pause, edit —
 * so nobody edits database rows by hand.
 */
export default async function PlacementsAdminPage() {
  await requireAdmin();
  const [{ spotlights, sponsors }, free, setup, notes, deliveries] = await Promise.all([
    getPlacementsOverview().catch(() => ({ spotlights: [], sponsors: [] })),
    freeSponsorPositions().catch(() => [] as number[]),
    getSetupCheck(),
    getNotifications(15),
    getRecentWebhookEvents(25),
  ]);
  const setupProblems = setup.filter((s) => !s.ok);
  const now = Date.now();
  const live = spotlights.filter((s) => spotlightState(s, now) === "live").length;
  const queued = spotlights.filter((s) => spotlightState(s, now) === "queued").length;
  const liveSponsors = sponsors.filter((s) => s.slot.is_active && (!s.slot.ends_at || Date.parse(s.slot.ends_at) > now)).length;
  const attention = sponsors.filter((s) => ["needs_details", "waitlist", "on_hold"].includes(s.slot.status)).length;

  return (
    <div className="container max-w-5xl py-10">
      <h1 className="text-2xl font-bold tracking-tight">Paid placements</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Spotlights expire on their own at their end time; sponsor slots follow Dodo subscription events. Use this page
        for anything that needs a person.
      </p>

      {/* Setup check — the first thing to look at when an event "did nothing". */}
      <section className={cn("mt-6 rounded-xl border p-4 text-sm", setupProblems.length ? "border-amber-500/40 bg-amber-500/[0.06]" : "border-border bg-card")}>
        <p className="font-semibold">
          {setupProblems.length ? `Setup: ${setupProblems.length} thing${setupProblems.length === 1 ? "" : "s"} to fix` : "Setup: everything in place ✓"}
        </p>
        <ul className="mt-2 space-y-1">
          {setup.map((s) => (
            <li key={s.label} className="flex gap-2">
              <span className={s.ok ? "text-success" : "text-danger"}>{s.ok ? "✓" : "✗"}</span>
              <span>
                {s.label}
                {!s.ok && <span className="block text-xs text-muted-foreground">{s.fix}</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Notifications — the same feed as the dashboard bell. */}
      <section className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Notifications{notes.unread > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{notes.unread} new</span>}
          </h2>
          {notes.unread > 0 && (
            <form action={markNotificationsReadAction}>
              <button className={btn}>Mark all read</button>
            </form>
          )}
        </div>
        {notes.items.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{notes.available ? "Nothing yet." : "Unavailable until migration 20261116 is applied."}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border bg-card text-sm">
            {notes.items.map((n) => (
              <li key={n.id} className={cn("p-3", !n.read_at && "bg-primary/[0.04]")}>
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {!n.read_at && <span className="size-2 rounded-full bg-primary" aria-label="unread" />}
                  {n.title}
                  <span className="text-xs font-normal text-muted-foreground">{fmt(n.created_at)}</span>
                </p>
                {n.body && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{n.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Spotlights live" value={`${live} / ${SPOTLIGHT.slots}`} />
        <Stat label="Spotlights queued" value={String(queued)} />
        <Stat label="Sponsors live" value={`${liveSponsors} / ${SPONSOR.positions.length}`} />
        <Stat label="Need attention" value={String(attention)} tone={attention > 0 ? "warn" : undefined} />
      </dl>

      {/* ── Spotlights ─────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Spotlights (last 30 days)</h2>
        {spotlights.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No Spotlight runs yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            {spotlights.map((s) => {
              const state = spotlightState(s, now);
              const buyer = s.payments.find((p) => !p.refunded_at)?.customer_email ?? s.payments[0]?.customer_email;
              return (
                <li key={s.host} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 text-sm">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <Link href={`/listed/${s.host}`} className="hover:underline">{s.name}</Link>
                      <StatePill state={state} />
                    </p>
                    <p className="text-muted-foreground">{s.host} · {fmt(s.start)} → {fmt(s.until)}</p>
                    <p className="text-muted-foreground">Buyer: {buyer ?? "unknown"}</p>
                    {s.payments.length > 0 && (
                      <ul className="mt-1 text-xs text-muted-foreground">
                        {s.payments.map((p) => (
                          <li key={p.payment_id}>
                            {p.payment_id} · {p.days}d · {fmt(p.starts_at)} → {fmt(p.ends_at)}
                            {p.refunded_at && <span className="ml-1 font-medium text-danger">refunded {fmt(p.refunded_at)}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <form action={grantSpotlightAction}>
                      <input type="hidden" name="host" value={s.host} />
                      <input type="hidden" name="days" value={SPOTLIGHT.days} />
                      <button className={btn}>+{SPOTLIGHT.days} days</button>
                    </form>
                    {state !== "ended" && (
                      <form action={endSpotlightAction}>
                        <input type="hidden" name="host" value={s.host} />
                        <button className={cn(btn, "text-danger")}>{state === "queued" ? "Cancel booking" : "End now"}</button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <details className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm">
          <summary className="cursor-pointer font-medium">Start a Spotlight by hand</summary>
          <p className="mt-2 text-muted-foreground">
            For a payment that didn&apos;t come through, or a comp. Owner-verified listings only; queues if every slot is
            taken.
          </p>
          <form action={grantSpotlightAction} className="mt-3 flex flex-wrap items-end gap-2">
            <Field label="Host"><input name="host" required placeholder="example.com" className={input} /></Field>
            <Field label="Days"><input name="days" type="number" min={1} max={90} defaultValue={SPOTLIGHT.days} className={cn(input, "w-20")} /></Field>
            <Field label="Buyer email (optional)"><input name="email" type="email" className={input} /></Field>
            <button className={btn}>Start</button>
          </form>
        </details>
      </section>

      {/* ── Sponsors ───────────────────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold">Sponsor slots</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Positions: after rank #{SPONSOR.positions.join(" and #")} · free now: {free.length ? free.map((p) => `#${p}`).join(", ") : "none"}
        </p>
        {sponsors.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No sponsor slots yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            {sponsors.map((s) => <SponsorRow key={s.slot.id} s={s} now={now} />)}
          </ul>
        )}

        <details className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm">
          <summary className="cursor-pointer font-medium">Add a sponsor slot by hand</summary>
          <p className="mt-2 text-muted-foreground">For a sponsor paying outside Dodo. It shows until the end date.</p>
          <SlotForm action={createSlotAction} submit="Add slot" />
        </details>
      </section>

      {/* ── Webhook log ────────────────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold">Webhook deliveries</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every event Dodo sent, newest first. 401 = signature mismatch (wrong secret, or test vs live mode); 500 =
          an error here (Dodo retries); 200 = handled.
        </p>
        {!deliveries.available ? (
          <p className="mt-2 text-sm text-muted-foreground">Unavailable until migration 20261116 is applied.</p>
        ) : deliveries.items.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No deliveries recorded yet. If you sent a test from Dodo and nothing appears here, the event didn&apos;t reach
            the site — check the endpoint URL is exactly https://www.realrank.lol/api/webhooks/dodo.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 align-top">
                {deliveries.items.map((d) => (
                  <tr key={d.id}>
                    <td className="whitespace-nowrap px-3 py-2">{fmt(d.received_at)}</td>
                    <td className="px-3 py-2 font-mono">{d.event_type ?? "—"}</td>
                    <td className={cn("px-3 py-2 font-semibold", d.http_status >= 400 ? "text-danger" : "text-success")}>{d.http_status}</td>
                    <td className="px-3 py-2">{d.outcome ?? "—"}</td>
                    <td className="max-w-[22rem] break-words px-3 py-2 font-mono text-muted-foreground">
                      {d.error && <span className="block text-danger">{d.error}</span>}
                      {d.summary ? JSON.stringify(d.summary) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function SponsorRow({ s, now }: { s: AdminSponsor; now: number }) {
  const { slot, billing } = s;
  const live = slot.is_active && (!slot.ends_at || Date.parse(slot.ends_at) > now);
  return (
    <li className="p-4 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {slot.display_name}
            <StatePill state={live ? "live" : slot.status} />
          </p>
          <p className="truncate text-muted-foreground">
            {slot.site_url || "no link yet"} · after #{slot.position_after_rank} · until {fmt(slot.ends_at)}
          </p>
          {slot.description && <p className="text-muted-foreground">“{slot.description}”</p>}
          {billing ? (
            <p className="text-xs text-muted-foreground">
              {billing.subscription_id} · {billing.customer_email ?? "no email"} · billing {billing.status} · paid through{" "}
              {fmt(billing.paid_through)} · last event {billing.last_event ?? "—"}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Manual slot (no subscription)</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {slot.status === "paused" ? (
            <StateButton id={slot.id} to="resume" label="Resume" />
          ) : slot.status !== "ended" ? (
            <StateButton id={slot.id} to="pause" label="Pause" />
          ) : null}
          {slot.status !== "ended" && <StateButton id={slot.id} to="end" label="End now" danger />}
        </div>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          {["needs_details", "waitlist"].includes(slot.status) ? "Fill in details & go live" : "Edit"}
        </summary>
        <SlotForm
          action={saveSlotAction}
          submit="Save"
          slotId={slot.id}
          defaults={{
            name: slot.display_name,
            url: slot.site_url,
            pitch: slot.description ?? "",
            position: slot.position_after_rank,
            endsAt: slot.ends_at,
          }}
          offerGoLive={!slot.is_active}
        />
      </details>
    </li>
  );
}

function SlotForm({
  action,
  submit,
  slotId,
  defaults,
  offerGoLive = false,
}: {
  action: (fd: FormData) => Promise<void>;
  submit: string;
  slotId?: string;
  defaults?: { name: string; url: string; pitch: string; position: number; endsAt: string | null };
  offerGoLive?: boolean;
}) {
  const endsDefault = (defaults?.endsAt ?? new Date(Date.now() + 31 * 86_400_000).toISOString()).slice(0, 16);
  return (
    <form action={action} className="mt-3 grid gap-2 sm:grid-cols-2">
      {slotId && <input type="hidden" name="id" value={slotId} />}
      <Field label="Name"><input name="name" required maxLength={SPONSOR.nameMax} defaultValue={defaults?.name} className={input} /></Field>
      <Field label="Website"><input name="url" required defaultValue={defaults?.url} className={input} /></Field>
      <Field label="Pitch"><input name="pitch" maxLength={SPONSOR.pitchMax} defaultValue={defaults?.pitch} className={input} /></Field>
      <Field label="Position (after rank)">
        <select name="position" defaultValue={defaults?.position ?? SPONSOR.positions[0]} className={input}>
          {SPONSOR.positions.map((p) => <option key={p} value={p}>#{p}</option>)}
        </select>
      </Field>
      <Field label="Ends (UTC)"><input name="ends_at" type="datetime-local" defaultValue={endsDefault} className={input} /></Field>
      <div className="flex items-end gap-3">
        {offerGoLive && (
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" name="go_live" defaultChecked /> Go live
          </label>
        )}
        <button className={btn}>{submit}</button>
      </div>
    </form>
  );
}

function StateButton({ id, to, label, danger = false }: { id: string; to: string; label: string; danger?: boolean }) {
  return (
    <form action={setSlotStateAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value={to} />
      <button className={cn(btn, danger && "text-danger")}>{label}</button>
    </form>
  );
}

function StatePill({ state }: { state: string }) {
  const tone =
    state === "live" || state === "active"
      ? "bg-success/15 text-success"
      : ["needs_details", "waitlist", "on_hold"].includes(state)
        ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
        : "bg-muted text-muted-foreground";
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>{state.replace("_", " ")}</span>;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <dd className={cn("text-xl font-bold tabular-nums", tone === "warn" && "text-amber-600 dark:text-amber-300")}>{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      {label}
      {children}
    </label>
  );
}

const input = "h-9 rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-primary/50";
const btn = "inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted";
