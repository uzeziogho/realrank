"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { track } from "@/lib/track";

/**
 * The one "Connect Google Search Console" call-to-action, reused across the
 * funnel so the primary action and its reassurance read the same everywhere.
 * Fires a connect_click event so the owner can see where connects originate.
 */
export function ConnectCTA({
  label = "Connect Search Console",
  size = "lg",
  subtext = "Read-only access · free · about 30 seconds",
  source,
  align = "center",
  className,
}: {
  label?: string;
  size?: "sm" | "default" | "lg";
  /** Pass null to hide the reassurance line. */
  subtext?: string | null;
  /** Where this CTA lives, recorded on the connect_click event (e.g. "home_hero"). */
  source?: string;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        align === "center" ? "items-center" : "items-start",
        className,
      )}
    >
      <Button asChild size={size}>
        <Link href="/login" onClick={() => track("connect_click", source)}>
          {label}
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>
  );
}
