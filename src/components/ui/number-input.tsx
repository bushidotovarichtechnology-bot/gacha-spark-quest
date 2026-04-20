import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * NumberInput
 * Displays a number with Indonesian thousand separators (e.g. 1.000.000)
 * while emitting a raw numeric value via onValueChange.
 * Optional prefix (e.g. "Rp") and suffix (e.g. "koin") rendered as adornments inside the field.
 */
export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "prefix"> {
  value: number | string | null | undefined;
  onValueChange?: (value: number) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  prefix?: string;
  suffix?: string;
}

const formatID = (n: number) => new Intl.NumberFormat("id-ID").format(n);

const parseRaw = (str: string): number => {
  const digits = str.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) || 0;
};

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, onChange, min = 0, max, className, prefix, suffix, ...props }, ref) => {
    const numericValue = typeof value === "number" ? value : parseRaw(String(value ?? ""));
    const display = numericValue === 0 && (value === "" || value === null || value === undefined)
      ? ""
      : formatID(numericValue);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = parseRaw(e.target.value);
      if (typeof min === "number" && raw < min) raw = min;
      if (typeof max === "number" && raw > max) raw = max;

      onValueChange?.(raw);

      if (onChange) {
        const synthetic = {
          ...e,
          target: { ...e.target, value: String(raw) },
          currentTarget: { ...e.currentTarget, value: String(raw) },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(synthetic);
      }
    };

    // Approximate adornment widths (ch units scale with font-size)
    const prefixPad = prefix ? `${prefix.length + 1.5}ch` : undefined;
    const suffixPad = suffix ? `${suffix.length + 1.5}ch` : undefined;

    if (!prefix && !suffix) {
      return (
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          className={className}
          {...props}
        />
      );
    }

    return (
      <div className="relative w-full">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground select-none">
            {prefix}
          </span>
        )}
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          className={cn(className)}
          style={{
            paddingLeft: prefixPad,
            paddingRight: suffixPad,
            ...(props.style ?? {}),
          }}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground select-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";
