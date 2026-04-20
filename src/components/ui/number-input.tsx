import * as React from "react";
import { Input } from "@/components/ui/input";

/**
 * NumberInput
 * Displays a number with Indonesian thousand separators (e.g. 1.000.000)
 * while emitting a raw numeric value via onValueChange (or via onChange with e.target.value as the raw number string).
 *
 * Use this for price/coin/quantity fields in admin where readability matters.
 * Does not support decimals (integer only).
 */
export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number | string | null | undefined;
  onValueChange?: (value: number) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
}

const formatID = (n: number) => new Intl.NumberFormat("id-ID").format(n);

const parseRaw = (str: string): number => {
  // Keep digits only
  const digits = str.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) || 0;
};

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onValueChange, onChange, min = 0, max, className, ...props }, ref) => {
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
        // Provide a synthetic event with the raw numeric string as value
        const synthetic = {
          ...e,
          target: { ...e.target, value: String(raw) },
          currentTarget: { ...e.currentTarget, value: String(raw) },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(synthetic);
      }
    };

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
);
NumberInput.displayName = "NumberInput";
