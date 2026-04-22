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

  let remainingLabel: string;
  if (isSoldOut) {
    remainingLabel = "0";
  } else if (safeRemaining < 5) {
    remainingLabel = "<5";
  } else if (safeRemaining < 10) {
    remainingLabel = "5+";
  } else if (safeRemaining < 25) {
    remainingLabel = "10+";
  } else if (safeRemaining < 50) {
    remainingLabel = "25+";
  } else if (safeRemaining < 100) {
    remainingLabel = "50+";
  } else {
    // Round down to nearest 50 and append "+"
    const bucket = Math.floor(safeRemaining / 50) * 50;
    remainingLabel = `${bucket}+`;
  }

  // Round percentage to nearest 5 to avoid leaking precise counts
  const rawPct = safeTotal > 0 ? (safeRemaining / safeTotal) * 100 : 0;
  const percentage = Math.round(rawPct / 5) * 5;

  return {
    remainingLabel,
    fractionLabel: `${remainingLabel}/${safeTotal}`,
    percentage,
    isSoldOut,
    isLow: !isSoldOut && rawPct < 30,
  };
}
