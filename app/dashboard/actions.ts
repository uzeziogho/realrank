"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { computeMomentum } from "@/lib/momentum";
import { categories } from "@/lib/config";
import { hostname } from "@/lib/utils";
import { fetchSiteMetrics } from "@/lib/google";
import { getUserGscClient, upsertSiteHistory } from "@/lib/gsc-server";

export interface ActionState {
  error?: string;
  success?: string;
}

async function requireUser() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured on this deployment.");
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Revalidate every public surface a site change can affect. */
function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  for (const c of categories) revalidatePath(`/category/${c.slug}`);
}

const categorySlugs = categories.map((c) => c.slug) as [string, ...string[]];

const siteSchema = z
  .object({
    site_url: z.string().trim().url("Enter a valid URL, e.g. https://example.com"),
    display_name: z.string().trim().min(1, "Name is required").max(80),
    description: z.string().trim().max(200).optional().or(z.literal("")),
    category: z.enum(categorySlugs).optional().or(z.literal("")),
    clicks_7d: z.coerce.number().int().min(0).default(0),
    clicks_28d: z.coerce.number().int().min(0).default(0),
  })
  .refine((v) => v.clicks_28d >= v.clicks_7d, {
    message: "28-day clicks must be greater than or equal to 7-day clicks.",
    path: ["clicks_28d"],
  });

export async function addSite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const parsed = siteSchema.safeParse({
    site_url: formData.get("site_url"),
    display_name: formData.get("display_name"),
    description: formData.get("description") ?? "",
    category: formData.get("category") ?? "",
    clicks_7d: formData.get("clicks_7d") ?? 0,
    clicks_28d: formData.get("clicks_28d") ?? 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const v = parsed.data;
  const { momentumScore, growthRate } = computeMomentum({
    clicks_7d: v.clicks_7d,
    clicks_28d: v.clicks_28d,
  });

  const { error } = await supabase.from("published_sites").insert({
    user_id: user.id,
    site_url: v.site_url,
    display_name: v.display_name,
    description: v.description || null,
    category: v.category || null,
    clicks_7d: v.clicks_7d,
    clicks_28d: v.clicks_28d,
    momentum_score: momentumScore,
    growth_rate: growthRate,
    is_active: true,
    last_refreshed_at:
      v.clicks_7d || v.clicks_28d ? new Date().toISOString() : null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You've already added this site." };
    }
    return { error: error.message };
  }

  revalidatePublic();
  return { success: `${v.display_name} published.` };
}

export async function setSiteActive(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";

  await supabase
    .from("published_sites")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id); // defence-in-depth alongside RLS

  revalidatePublic();
}

export async function deleteSite(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));

  await supabase
    .from("published_sites")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePublic();
}

/**
 * Publish a verified GSC property: fetch its real 7d/28d clicks from Google,
 * compute momentum, and insert (or re-activate) it in published_sites.
 * Preserves any custom display_name/category on an existing row.
 */
export async function publishProperty(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const siteUrl = String(formData.get("site_url") ?? "").trim();
  if (!siteUrl) return { error: "Missing property." };

  const client = await getUserGscClient(user.id);
  if (!client) return { error: "Google isn't connected. Reconnect and try again." };

  let metrics;
  try {
    metrics = await fetchSiteMetrics(client, siteUrl);
  } catch (err) {
    console.error("[publishProperty] GSC fetch failed:", err);
    return { error: "Couldn't fetch clicks from Search Console. Try again shortly." };
  }

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("published_sites")
    .select("id")
    .eq("user_id", user.id)
    .eq("site_url", siteUrl)
    .maybeSingle();

  let siteId = existing?.id ?? null;
  if (existing) {
    await supabase
      .from("published_sites")
      .update({ ...metrics, is_active: true, last_refreshed_at: now, updated_at: now })
      .eq("id", existing.id)
      .eq("user_id", user.id);
  } else {
    const { data: inserted, error } = await supabase
      .from("published_sites")
      .insert({
        user_id: user.id,
        site_url: siteUrl,
        display_name: hostname(siteUrl),
        ...metrics,
        is_active: true,
        last_refreshed_at: now,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    siteId = inserted?.id ?? null;
  }

  // Backfill daily history now so the sparkline/timeline populate instantly,
  // instead of waiting for the next scheduled refresh. Best-effort.
  if (siteId) await upsertSiteHistory(siteId, client, siteUrl);

  revalidatePublic();
  return { success: `${hostname(siteUrl)} published.` };
}

/** Hide a published property from the leaderboard (keeps its data). */
export async function unpublishProperty(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const siteUrl = String(formData.get("site_url") ?? "").trim();
  if (!siteUrl) return;

  await supabase
    .from("published_sites")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("site_url", siteUrl);

  revalidatePublic();
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
