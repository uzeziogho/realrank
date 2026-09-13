import { cn } from "@/lib/utils";

/** RealRank signal green (the accent "click-beat"). Fixed brand color. */
const SIGNAL = "#10BF5B";

/**
 * The RealRank "Cadence" mark: four click-beats rising on a fixed rhythm, the
 * fourth breaking the ramp and taking the green accent. The three ink bars use
 * `currentColor` so the mark inverts with the theme (dark on light, light on
 * dark); only the accent bar is a fixed brand green.
 */
export function LogoMark({
  size = 22,
  className,
  title = "RealRank",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label={title}
      className={className}
    >
      <rect x="9" y="64" width="14" height="26" rx="7" fill="currentColor" />
      <rect x="32" y="48" width="14" height="42" rx="7" fill="currentColor" />
      <rect x="55" y="30" width="14" height="60" rx="7" fill="currentColor" />
      <rect x="78" y="6" width="14" height="84" rx="7" fill={SIGNAL} />
    </svg>
  );
}

/**
 * Full lockup: mark + "RealRank" wordmark (Space Grotesk 700, tight tracking).
 * Space Grotesk is loaded via a stylesheet link in the root layout; the stack
 * falls back to the site sans if it hasn't loaded.
 */
export function Logo({
  markSize = 22,
  withWordmark = true,
  className,
}: {
  markSize?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={markSize} />
      {withWordmark && (
        <span
          className="font-bold tracking-[-0.035em]"
          style={{
            fontFamily:
              "'Space Grotesk', var(--font-geist-sans), system-ui, sans-serif",
            fontSize: markSize * 0.82,
            lineHeight: 1,
          }}
        >
          RealRank
        </span>
      )}
    </span>
  );
}
