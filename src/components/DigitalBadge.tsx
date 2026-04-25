import { KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md";
  variant?: "solid" | "soft";
}

/**
 * Consistent "DIGITAL" badge used across inventory cards, modals, and reveal screens.
 */
const DigitalBadge = ({ className, size = "sm", variant = "solid" }: Props) => {
  const sizing =
    size === "md"
      ? "px-2 py-1 text-[11px] gap-1.5"
      : "px-1.5 py-0.5 text-[9px] gap-1";
  const iconSize = size === "md" ? "h-3.5 w-3.5" : "h-3 w-3";
  const palette =
    variant === "soft"
      ? "bg-primary/15 text-primary border border-primary/30"
      : "bg-primary text-primary-foreground border border-primary/40 shadow-sm";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-bold uppercase tracking-wider",
        sizing,
        palette,
        className,
      )}
    >
      <KeyRound className={iconSize} />
      Digital
    </span>
  );
};

export default DigitalBadge;
