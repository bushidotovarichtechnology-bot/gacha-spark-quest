import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, onKeyDown, onWheel, min, ...props }, ref) => {
    const isNumber = type === "number";
    // Default minimum 0 for number inputs unless explicitly overridden (including negative values)
    const effectiveMin = isNumber && min === undefined ? 0 : min;
    const minNum = effectiveMin !== undefined ? Number(effectiveMin) : undefined;

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      if (isNumber) {
        let v = e.target.value;
        // Strip leading zeros: "01" -> "1", "007" -> "7", but keep "0" and "0.5"
        if (/^0\d/.test(v)) {
          v = v.replace(/^0+/, "") || "0";
          e.target.value = v;
        }
        // Block negatives when min >= 0
        if (minNum !== undefined && minNum >= 0 && v.startsWith("-")) {
          e.target.value = v.replace(/-/g, "");
        }
      }
      onChange?.(e);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
      if (isNumber && minNum !== undefined && minNum >= 0) {
        // Prevent typing minus / "e" exponent for non-negative number fields
        if (e.key === "-" || e.key === "e" || e.key === "E") {
          e.preventDefault();
        }
      }
      onKeyDown?.(e);
    };

    const handleWheel: React.WheelEventHandler<HTMLInputElement> = (e) => {
      // Prevent accidental value change via mouse wheel scroll
      if (isNumber && document.activeElement === e.currentTarget) {
        e.currentTarget.blur();
      }
      onWheel?.(e);
    };

    return (
      <input
        type={type}
        inputMode={isNumber ? "numeric" : undefined}
        min={effectiveMin}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
