import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";

/** /admin opens the dashboard, where the admin menu and overview live. */
export default async function AdminIndex() {
  await requireAdmin("/admin");
  redirect("/dashboard");
}
