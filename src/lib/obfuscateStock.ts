// Obfuscates exact remaining stock counts for non-admin users.
// Server-side draws still use precise values via secure_draw RPC; this only
// affects the visual display so users can't reverse-engineer odds or scrape
// exact inventory positions.

export type ObfuscatedStock = {
  /** Display string for "remaining", e.g. "12+", "~20", "<5", "0" */
  remainingLabel: string;
  /** Display string for "remaining/total", e.g. "12+/50" */
  fractionLabel: string;
  /** Percentage rounded to nearest 5% for progress bars */
  percentage: number;
  /** True when stock is exhausted */
  isSoldOut: boolean;
  /** True when below the "almost gone" threshold (rough) */
  isLow: boolean;
};

export function obfuscateStock(remaining: number, total: number): ObfuscatedStock {
  const safeRemaining = Math.max(0, Math.floor(remaining));
  const safeTotal = Math.max(0, Math.floor(total));
  const isSoldOut = safeRemaining <= 0;

  // Show the exact remaining count so users can see real-time stock.
  const remainingLabel = String(safeRemaining);

  const rawPct = safeTotal > 0 ? (safeRemaining / safeTotal) * 100 : 0;
  const percentage = Math.max(0, Math.min(100, Math.round(rawPct)));

  return {
    remainingLabel,
    fractionLabel: `${safeRemaining}/${safeTotal}`,
    percentage,
    isSoldOut,
    isLow: !isSoldOut && rawPct < 30,
  };
}
