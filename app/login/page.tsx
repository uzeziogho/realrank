import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOptionalUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Connect Search Console",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Already connected? Go straight to the dashboard.
  const user = await getOptionalUser();
  if (user) redirect("/dashboard");

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
          Read-only access (<code className="text-foreground">webmasters.readonly</code>). We can never change your site.
        </p>

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
