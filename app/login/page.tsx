import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/waitlist-form";
import { getOptionalUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Connect Search Console",
  robots: { index: false, follow: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "The Google connection isn't fully configured yet. Please try again shortly.",
  start_failed: "Couldn't start the Google connection. Please try again.",
  signin_failed: "The Google connection didn't complete. Please try again.",
  bad_state: "This link expired. Please try connecting again.",
  exchange_failed: "Google authorization failed. Please try again.",
  no_id_token: "Google didn't return the expected details. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already connected? Go straight to the dashboard.
  const user = await getOptionalUser();
  if (user) redirect("/dashboard");

  const errorKey = (await searchParams).error;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] ?? "Something went wrong. Please try again." : null;
  const ready = isSupabaseConfigured() && Boolean(process.env.GOOGLE_CLIENT_ID);

  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto mb-5 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Activity className="size-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">
          Add your site to {siteConfig.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect Google Search Console to verify your organic clicks and claim
          your spot on the leaderboard. No passwords, no separate sign-up.
        </p>

        {errorMessage && (
          <p className="mt-6 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <div className="mt-8">
          {ready ? (
            <Button asChild size="lg" className="w-full">
              <a href="/api/auth/google/start">
                Connect Google Search Console
                <ArrowRight className="size-4" />
              </a>
            </Button>
          ) : (
            <Button size="lg" className="w-full" disabled>
              Connect Google Search Console
            </Button>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          Read-only access. We can never change your site.
        </p>

        {/* What happens next — removes uncertainty before the OAuth jump. */}
        <ol className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="font-semibold text-foreground">1.</span> Sign in with Google &amp; grant read-only Search Console access.</li>
          <li className="flex gap-2"><span className="font-semibold text-foreground">2.</span> Pick which verified properties to publish.</li>
          <li className="flex gap-2"><span className="font-semibold text-foreground">3.</span> Your real momentum appears on the board instantly.</li>
        </ol>

        {/* Pre-empt Google's "unverified app" screen so it doesn't scare people off. */}
        <details className="mx-auto mt-5 max-w-xs text-left">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
            Seeing a Google &quot;unverified app&quot; warning?
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            That&apos;s expected while our Google verification is in review. It doesn&apos;t
            affect your account&apos;s safety — we only request{" "}
            <code className="text-foreground">webmasters.readonly</code>. Click{" "}
            <strong>Advanced</strong> → <strong>Go to RealRank (unsafe)</strong> to continue.
          </p>
        </details>

        {/* Not ready to connect? Capture the email. */}
        <div className="mx-auto mt-6 flex max-w-xs flex-col items-center gap-2 border-t border-border pt-5">
          <p className="text-xs text-muted-foreground">Prefer to wait? Get launch updates.</p>
          <WaitlistForm source="login" />
        </div>

        {!ready && (
          <p className="mt-4 text-xs text-muted-foreground">
            Google isn&apos;t configured on this environment yet. Set the Supabase
            and Google OAuth env vars to enable it.
          </p>
        )}
      </div>
    </div>
  );
}
