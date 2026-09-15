import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Intentional "nothing here" state — icon, heading, subtext, optional CTA —
 * for zero-result cases (no courses in a destination, no comparator
 * selection) instead of blank space or plain text.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** "onDark" for placement on the ink-coloured course/CTA sections. */
  variant?: "default" | "onDark";
  className?: string;
}) {
  const onDark = variant === "onDark";
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center",
        onDark ? "border-white/15 bg-white/[0.04]" : "border-line bg-paper-dim",
        className,
      )}
    >
      <div
        className={cn(
          "mb-5 flex h-14 w-14 items-center justify-center rounded-full",
          onDark ? "bg-white/10" : "bg-paper shadow-card",
        )}
      >
        <Icon
          className={cn("h-6 w-6", onDark ? "text-paper/70" : "text-ink-soft")}
          aria-hidden="true"
        />
      </div>
      <h3 className={cn("text-h6", onDark ? "text-white" : "text-ink")}>{title}</h3>
      {description && (
        <p
          className={cn(
            "mt-1.5 max-w-[38ch] text-body",
            onDark ? "text-paper/60" : "text-ink-soft",
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
