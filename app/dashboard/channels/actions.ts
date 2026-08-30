"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { encryptToken } from "@/lib/crypto";

export interface ActionState {
  error?: string;
  success?: string;
}

async function requireUser() {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const suffix = crypto.randomBytes(3).toString("hex"); // 6 chars → collision-safe
  return `${base || "link"}-${suffix}`;
}

const channelSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  destination_url: z.string().trim().url("Enter a valid URL, e.g. https://yoursite.com"),
});

export async function createChannel(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await requireUser();

  const parsed = channelSchema.safeParse({
    name: formData.get("name"),
    destination_url: formData.get("destination_url"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { error } = await supabase.from("channels").insert({
    user_id: user.id,
    name: parsed.data.name,
    slug: slugify(parsed.data.name),
    destination_url: parsed.data.destination_url,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/channels");
  return { success: `Channel "${parsed.data.name}" created.` };
}

export async function archiveChannel(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  await supabase.from("channels").update({ archived: true }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard/channels");
}

export async function deleteChannel(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id"));
  await supabase.from("channels").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard/channels");
}

const secretSchema = z
  .string()
  .trim()
  .regex(/^whsec_/, "That doesn't look like a Stripe signing secret (starts with whsec_).");

export async function saveStripeSecret(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user } = await requireUser();

  const parsed = secretSchema.safeParse(formData.get("secret"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid secret." };

  // stripe_connections has no user insert/update policy — write with the service
  // role so the encrypted secret never touches the client.
  const service = createServiceClient();
  const { data: existing } = await service
    .from("stripe_connections")
    .select("webhook_token")
    .eq("user_id", user.id)
    .maybeSingle();

  const webhook_token = existing?.webhook_token ?? crypto.randomBytes(16).toString("hex");

  const { error } = await service.from("stripe_connections").upsert(
    {
      user_id: user.id,
      webhook_token,
      encrypted_webhook_secret: encryptToken(parsed.data),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/dashboard/channels");
  return { success: "Stripe connected. Revenue will attribute on the next paid event." };
}

export async function disconnectStripe(): Promise<void> {
  const { supabase, user } = await requireUser();
  await supabase.from("stripe_connections").delete().eq("user_id", user.id);
  revalidatePath("/dashboard/channels");
}
