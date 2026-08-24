"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RankingView } from "@/lib/config";

/**
 * Momentum / Volume switch. Writes the choice to the `?view=` URL param so the
 * Server Component re-renders the ranked list — keeping both views crawlable and
 * shareable. Default (no param) is Momentum.
 */
export function RankingToggle({ view }: { view: RankingView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function select(next: RankingView) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "momentum") {
      params.delete("view");
    } else {
      params.set("view", next);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <div
      role="tablist"
      aria-label="Ranking method"
      className={cn(
        "inline-flex items-center rounded-lg border border-border bg-card p-1",
        isPending && "opacity-70",
      )}
    >
      <ToggleItem
        active={view === "momentum"}
        onClick={() => select("momentum")}
        icon={<TrendingUp className="size-4" />}
        label="Momentum"
      />
      <ToggleItem
        active={view === "volume"}
        onClick={() => select("volume")}
        icon={<BarChart3 className="size-4" />}
        label="Volume"
      />
    </div>
  );
}

function ToggleItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
