"use server";

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface WaitlistState {
  error?: string;
  success?: string;
}

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");

/**
 * Capture an email from a visitor not ready to connect Google yet. Written with
 * the service role (no client insert policy on waitlist). Idempotent on email.
 */
export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid email." };

  if (!isSupabaseConfigured()) {
    // Nothing to store against locally; treat as success so the UX is testable.
    return { success: "You're on the list — we'll be in touch." };
  }

  try {
    const supabase = createServiceClient();
    const source = String(formData.get("source") ?? "").slice(0, 60) || null;
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: parsed.data, source });
    // Duplicate email → already subscribed; that's a success from the user's POV.
    if (error && error.code !== "23505") throw error;
  } catch (err) {
    console.error("[waitlist] join failed:", err);
    return { error: "Couldn't save that just now — please try again." };
  }

  return { success: "You're on the list — we'll be in touch." };
}
