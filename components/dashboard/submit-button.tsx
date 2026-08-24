"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pending-aware submit button for a server-action <form>. */
export function SubmitButton({
  children,
  pendingText,
  className,
  confirm,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  /** If set, window.confirm() must pass before the form submits. */
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
        className,
      )}
    >
      {pending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          {pendingText ?? "Working…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}
