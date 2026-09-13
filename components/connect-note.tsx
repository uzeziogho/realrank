import { cn } from "@/lib/utils";

/**
 * Friction-reducing microcopy shown under a "connect" CTA. Placing the main
 * objection-killer right at the point of action is a well-documented conversion
 * lift, so we reuse one consistent line everywhere the connect CTA appears.
 */
export function ConnectNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Read-only access · free · about 30 seconds
    </p>
  );
}
