import { cn } from "@/lib/utils";

interface BetaBadgeProps {
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

/**
 * Reusable BETA badge component. Displays a gradient-accented badge to
 * indicate features that are in beta testing. Used on navigation items,
 * page headers, and feature cards.
 */
export default function BetaBadge({ className, size = "sm" }: BetaBadgeProps) {
  return (
    <span
      aria-label="Beta feature"
      className={cn(
        "inline-flex items-center rounded-full font-bold uppercase tracking-widest",
        "bg-gradient-to-r from-primary/15 via-primary/10 to-[hsl(149_53%_35%/0.12)]",
        "border border-primary/20 text-primary shadow-sm",
        size === "sm" && "px-2 py-0.5 text-[0.55rem]",
        size === "md" && "px-3 py-1 text-[0.65rem]",
        className,
      )}
    >
      Beta
    </span>
  );
}
