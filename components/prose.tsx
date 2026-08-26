import { cn } from "@/lib/utils";

/**
 * Typographic wrapper for hand-written article bodies. Styling only — the
 * content inside each article is unique, authored prose (no templated copy).
 */
export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "leading-relaxed text-muted-foreground",
        "[&>p]:mt-4 [&>p]:text-[15px]",
        "[&>h2]:mt-10 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:tracking-tight [&>h2]:text-foreground",
        "[&>h3]:mt-8 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-foreground",
        "[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&>ul]:mt-4 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-5",
        "[&>ol]:mt-4 [&>ol]:list-decimal [&>ol]:space-y-2 [&>ol]:pl-5",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&>blockquote]:mt-6 [&>blockquote]:border-l-2 [&>blockquote]:border-primary [&>blockquote]:pl-4 [&>blockquote]:italic",
        className,
      )}
    >
      {children}
    </div>
  );
}
