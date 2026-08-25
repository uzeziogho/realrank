"use client";

import { useActionState } from "react";
import { Globe, Check, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/dashboard/submit-button";
import {
  publishProperty,
  unpublishProperty,
  type ActionState,
} from "@/app/dashboard/actions";
import { hostname } from "@/lib/utils";

export interface GscProperty {
  siteUrl: string;
  published: boolean;
}

export function GscProperties({ properties }: { properties: GscProperty[] }) {
  if (properties.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
        No verified properties found on this Google account. Add and verify a
        site in Search Console, then refresh.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <ul className="divide-y divide-border">
        {properties.map((p) => (
          <PropertyRow key={p.siteUrl} property={p} />
        ))}
      </ul>
    </div>
  );
}

const initial: ActionState = {};

function PropertyRow({ property }: { property: GscProperty }) {
  const [state, action, pending] = useActionState(publishProperty, initial);

  return (
    <li className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Globe className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="truncate font-medium">{hostname(property.siteUrl)}</p>
          {state.error && <p className="text-xs text-danger">{state.error}</p>}
        </div>
      </div>

      {property.published ? (
        <div className="flex items-center gap-2">
          <Badge variant="success">
            <Check className="mr-1 size-3" /> Published
          </Badge>
          <form action={unpublishProperty}>
            <input type="hidden" name="site_url" value={property.siteUrl} />
            <SubmitButton className="border border-border hover:bg-accent" pendingText="Saving…">
              Unpublish
            </SubmitButton>
          </form>
        </div>
      ) : (
        <form action={action}>
          <input type="hidden" name="site_url" value={property.siteUrl} />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? (
              <><Loader2 className="size-3.5 animate-spin" /> Fetching clicks…</>
            ) : (
              <><Plus className="size-3.5" /> Publish</>
            )}
          </button>
        </form>
      )}
    </li>
  );
}
