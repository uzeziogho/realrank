import { AdminNav } from "@/components/admin/admin-nav";

/**
 * Frame for every page an admin works in (/dashboard and its tabs, and the
 * /admin pages): the admin menu beside (desktop) or above (phones) the page.
 */
export function AdminShell({ unread = 0, children }: { unread?: number; children: React.ReactNode }) {
  return (
    <div className="container max-w-6xl py-10 lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
      <AdminNav unread={unread} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Admins get the shell; everyone else keeps the page's usual container. */
export function DashFrame({
  admin,
  unread = 0,
  className = "container max-w-5xl py-10",
  children,
}: {
  admin: boolean;
  unread?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return admin ? <AdminShell unread={unread}>{children}</AdminShell> : <div className={className}>{children}</div>;
}
