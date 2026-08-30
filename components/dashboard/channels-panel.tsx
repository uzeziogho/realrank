"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Loader2, Copy, Check, Archive, Trash2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createChannel,
  archiveChannel,
  deleteChannel,
  saveStripeSecret,
  disconnectStripe,
  type ActionState,
} from "@/app/dashboard/channels/actions";
import type { ChannelStat, StripeConnectionStatus } from "@/lib/channels";

const initial: ActionState = {};
const inputCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2";

function money(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(
      cents / 100,
    );
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard blocked — no-op */
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}

export function ChannelsPanel({
  channels,
  stripe,
}: {
  channels: ChannelStat[];
  stripe: StripeConnectionStatus;
}) {
  const [state, formAction, pending] = useActionState(createChannel, initial);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <div className="space-y-8">
      {/* Create */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">New tracking link</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One link per channel (an X post, a subreddit, a directory, an outbid board…).
          Share the tracking link; RealRank counts the clicks and attributes revenue.
        </p>
        <form ref={formRef} action={formAction} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium">Channel name</label>
            <input id="name" name="name" required maxLength={60} placeholder="Reddit — r/SaaS" className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="destination_url" className="text-sm font-medium">Destination URL</label>
            <input id="destination_url" name="destination_url" type="url" required placeholder="https://yoursite.com/pricing" className={inputCls} />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="size-4 animate-spin" /> Creating…</> : <><Plus className="size-4" /> Create</>}
          </Button>
        </form>
        {state.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}
        {state.success && <p className="mt-3 text-sm text-success">{state.success}</p>}
      </div>

      {/* Ranking */}
      <div>
        <h2 className="mb-1 text-lg font-semibold">Channels by revenue</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Ranked by revenue, then efficiency (revenue per visit). This is where your
          time is actually paying off.
        </p>

        {channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            No channels yet — create your first tracking link above.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="hidden grid-cols-[1.6fr_5rem_5rem_6rem_6rem_auto] gap-3 border-b border-border px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
              <span>Channel</span>
              <span className="text-right">Visits</span>
              <span className="text-right">Customers</span>
              <span className="text-right">Revenue</span>
              <span className="text-right">Rev / visit</span>
              <span className="text-right">Link</span>
            </div>
            <ol className="divide-y divide-border">
              {channels.map((c, i) => (
                <li key={c.id} className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[1.6fr_5rem_5rem_6rem_6rem_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                      <span className="truncate font-medium">{c.name}</span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Link2 className="size-3 shrink-0" />
                      /go/{c.slug}
                    </p>
                    {/* Mobile metrics */}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm md:hidden">
                      <span className="text-muted-foreground">{c.visits} visits</span>
                      <span className="text-muted-foreground">{c.customers} customers</span>
                      <span className="font-medium">{money(c.revenueCents, c.currency)}</span>
                    </div>
                  </div>
                  <span className="hidden text-right tabular-nums md:block">{c.visits}</span>
                  <span className="hidden text-right tabular-nums md:block">{c.customers}</span>
                  <span className="hidden text-right font-semibold tabular-nums md:block">{money(c.revenueCents, c.currency)}</span>
                  <span className="hidden text-right tabular-nums text-muted-foreground md:block">
                    {c.visits > 0 ? money(Math.round(c.revenuePerVisit), c.currency) : "—"}
                  </span>
                  <div className="flex items-center justify-end gap-1.5">
                    <CopyButton value={c.trackingUrl} />
                    <form action={archiveChannel}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" title="Archive" className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground">
                        <Archive className="size-3.5" />
                      </button>
                    </form>
                    <form action={deleteChannel}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" title="Delete" className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-danger">
                        <Trash2 className="size-3.5" />
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <StripeSetup stripe={stripe} />
    </div>
  );
}

function StripeSetup({ stripe }: { stripe: StripeConnectionStatus }) {
  const [state, formAction, pending] = useActionState(saveStripeSecret, initial);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Revenue attribution (Stripe)</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${stripe.connected ? "bg-success/10 text-success" : "border border-border text-muted-foreground"}`}>
          {stripe.connected ? "Connected" : "Not connected"}
        </span>
      </div>

      {stripe.connected && stripe.webhookUrl ? (
        <div className="mt-4 space-y-4 text-sm">
          <p className="text-muted-foreground">
            Paid events from Stripe now attribute to the channel that referred the customer.
          </p>
          <div>
            <p className="mb-1 font-medium">Your webhook URL</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">{stripe.webhookUrl}</code>
              <CopyButton value={stripe.webhookUrl} />
            </div>
          </div>
          <form action={disconnectStripe}>
            <Button type="submit" variant="outline" size="sm">Disconnect</Button>
          </form>
        </div>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            In Stripe → Developers → Webhooks, add an endpoint for{" "}
            <code className="text-foreground">checkout.session.completed</code> and{" "}
            <code className="text-foreground">invoice.paid</code>. Save it, then paste its
            <strong className="text-foreground"> signing secret</strong> below. We&apos;ll show
            you the exact URL to use once you save.
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="secret" className="text-sm font-medium">Signing secret</label>
            <input id="secret" name="secret" required placeholder="whsec_…" className={inputCls} />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.success && <p className="text-sm text-success">{state.success}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Connect Stripe"}
          </Button>
        </form>
      )}

      {/* Wiring instructions — always visible */}
      <div className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">One-time checkout wiring</p>
        <p className="mt-1">
          The tracking link adds <code className="text-foreground">?rr_click=…</code> to your
          destination. Capture it and pass it into Checkout so revenue maps to the channel:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
{`// when you create the Stripe Checkout Session:
stripe.checkout.sessions.create({
  // …your line items…
  client_reference_id: rrClick, // the ?rr_click value from the visit
})`}
        </pre>
      </div>
    </div>
  );
}
