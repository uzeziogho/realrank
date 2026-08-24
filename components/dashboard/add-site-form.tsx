"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addSite, type ActionState } from "@/app/dashboard/actions";
import { categories } from "@/lib/config";

const initial: ActionState = {};

export function AddSiteForm() {
  const [state, formAction, pending] = useActionState(addSite, initial);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset the form after a successful publish.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  const inputCls =
    "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-ring focus-visible:ring-2";

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="display_name" className="text-sm font-medium">
            Site name
          </label>
          <input id="display_name" name="display_name" required maxLength={80}
            placeholder="Acme Analytics" className={inputCls} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="site_url" className="text-sm font-medium">
            URL
          </label>
          <input id="site_url" name="site_url" type="url" required
            placeholder="https://acme.com" className={inputCls} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select id="category" name="category" defaultValue="" className={inputCls}>
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            Description <span className="text-muted-foreground">(optional)</span>
          </label>
          <input id="description" name="description" maxLength={200}
            placeholder="One line about your site" className={inputCls} />
        </div>
      </div>

      {/* Seed clicks — replaced by real Search Console data once connected. */}
      <button type="button" onClick={() => setShowAdvanced((s) => !s)}
        className="flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground">
        <ChevronDown className={`size-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        Seed click counts (optional)
      </button>
      {showAdvanced && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="clicks_7d" className="text-sm font-medium">7-day clicks</label>
            <input id="clicks_7d" name="clicks_7d" type="number" min={0} defaultValue={0} className={inputCls} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="clicks_28d" className="text-sm font-medium">28-day clicks</label>
            <input id="clicks_28d" name="clicks_28d" type="number" min={0} defaultValue={0} className={inputCls} />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            These are placeholders so your row has a momentum score immediately.
            The cron job overwrites them with verified Search Console clicks.
          </p>
        </div>
      )}

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-success">{state.success}</p>}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <><Loader2 className="size-4 animate-spin" /> Publishing…</> : <><Plus className="size-4" /> Publish site</>}
      </Button>
    </form>
  );
}
