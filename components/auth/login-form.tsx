"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function LoginForm() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;
    setStatus("sending");
    setMessage("");
    try {
      // Import lazily so the page renders even without env configured.
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <span className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Activity className="size-5" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Sign in to {siteConfig.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll email you a magic link — no password required.
        </p>
      </div>

      {!configured ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Authentication isn&apos;t configured on this environment yet. Add your
          Supabase keys to <code className="text-foreground">.env.local</code> to
          enable sign-in.
        </div>
      ) : status === "sent" ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 text-center">
          <CheckCircle2 className="size-8 text-primary" />
          <p className="font-medium">Check your inbox</p>
          <p className="text-sm text-muted-foreground">
            We sent a magic link to <span className="text-foreground">{email}</span>.
            Click it to finish signing in.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="text-sm text-primary hover:underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none ring-ring focus-visible:ring-2"
            />
          </div>
          <Button type="submit" disabled={status === "sending"}>
            {status === "sending" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send magic link"
            )}
          </Button>
          {status === "error" && (
            <p className="text-sm text-danger">{message}</p>
          )}
        </form>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
      </p>
    </div>
  );
}
