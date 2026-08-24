import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getOptionalUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  // Already signed in? Skip straight to the dashboard.
  const user = await getOptionalUser();
  if (user) redirect("/dashboard");

  return (
    <div className="container flex min-h-[70vh] items-center py-16">
      <LoginForm />
    </div>
  );
}
