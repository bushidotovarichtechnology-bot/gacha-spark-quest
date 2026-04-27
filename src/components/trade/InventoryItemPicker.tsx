import { useMemo, useState } from "react";
import { Coins, CheckSquare, Square, Lock } from "lucide-react";
import { toast } from "sonner";
import { useGacha, type InventoryItem } from "@/context/GachaContext";
import { supabaseImg } from "@/lib/imageTransform";
import { TRADABLE_TIERS, type TradableTier, isTradableTier } from "@/lib/tradeApi";
import { cn } from "@/lib/utils";

interface Props {
  /** Pre-locked tier; when set, only items of this tier are pickable. */
  lockedTier?: TradableTier;
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  /** Optional list of inventory ids to hide (e.g. items already in another offer). */
  hideIds?: Set<string>;
  /** Empty-state copy override. */
  emptyMessage?: string;
}

/**
 * Hacker-themed inventory picker for P2P trade. Restricted to tiers S/A/B.
 * Tier C items are rendered visibly disabled (lock icon) so users see exactly
 * why those entries aren't selectable.
 */
const InventoryItemPicker = ({ lockedTier, selectedIds, onChange, hideIds, emptyMessage }: Props) => {
  const { items } = useGacha();
  const [tierFilter, setTierFilter] = useState<TradableTier>(lockedTier ?? "S");

  // Only show tradable items (Tier S/A/B). Tier C is hidden entirely.
  const visible = useMemo(() => {
    return items.filter((it) => {
      if (hideIds?.has(it.id)) return false;
      if (!isTradableTier(it.tier)) return false;
      if (lockedTier) return true; // locked-tier highlight handled per-cell
      if (it.tier !== tierFilter) return false;
      return true;
    });
  }, [items, lockedTier, tierFilter, hideIds]);

  const isSelectable = (it: InventoryItem): { ok: boolean; reason?: string } => {
    if (!isTradableTier(it.tier)) {
      return { ok: false, reason: `Tier ${it.tier} terkunci dari trade (anti-farming).` };
    }
    if (lockedTier && it.tier !== lockedTier) {
      return { ok: false, reason: `Hanya item Tier ${lockedTier} yang bisa dipilih dalam trade ini.` };
    }
    return { ok: true };
  };

  const toggle = (it: InventoryItem) => {
    const check = isSelectable(it);
    if (!check.ok) {
      toast.error(check.reason ?? "Item ini tidak bisa dipilih");
      return;
    }
    const next = new Set(selectedIds);
    if (next.has(it.id)) {
      next.delete(it.id);
    } else {
      const currentTier = (() => {
        const first = items.find((x) => next.has(x.id));
        return first?.tier;
      })();
      if (currentTier && currentTier !== it.tier) {
        toast.warning(`Pilihan sebelumnya (Tier ${currentTier}) di-reset — bundle harus satu tier.`);
        next.clear();
      }
      next.add(it.id);
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {!lockedTier && (
        <div className="flex flex-wrap gap-1.5">
          {TRADABLE_TIERS.map((t) => {
            const active = tierFilter === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTierFilter(t)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:text-foreground",
                )}
              >
                Tier {t}
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-md border-hacker border bg-hacker-bg p-6 text-center font-mono-hacker text-xs text-muted-foreground">
          {emptyMessage ?? "// no tradable items in this tier"}
        </div>
      ) : (
        <div className="grid max-h-[360px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {visible.map((it) => {
            const checked = selectedIds.has(it.id);
            const sel = isSelectable(it);
            const disabled = !sel.ok;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => toggle(it)}
                aria-disabled={disabled}
                title={sel.reason}
                className={cn(
                  "group relative overflow-hidden rounded-md border bg-hacker-bg p-2 text-left transition-all",
                  checked && "border-hacker box-glow-hacker",
                  !checked && !disabled && "border-border hover:border-hacker/60",
                  disabled && "border-border/50 opacity-50 cursor-not-allowed",
                )}
              >
                <div className="absolute right-1.5 top-1.5 z-10">
                  {disabled ? (
                    <Lock className="h-4 w-4 text-muted-foreground/70" />
                  ) : checked ? (
                    <CheckSquare className="h-4 w-4 text-hacker-green text-glow-hacker" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>
                <div className="aspect-square overflow-hidden rounded-sm bg-black/40">
                  <img
                    src={supabaseImg(it.image, 200)}
                    alt={it.prize}
                    loading="lazy"
                    decoding="async"
                    className={cn("h-full w-full object-contain", disabled && "grayscale")}
                  />
                </div>
                <div className="mt-1.5 font-mono-hacker text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      isTradableTier(it.tier) ? "text-hacker-green" : "text-muted-foreground",
                    )}>tier_{it.tier}</span>
                    <span className="flex items-center gap-0.5 text-accent">
                      <Coins className="h-2.5 w-2.5" />
                      {it.coinValue}
                    </span>
                  </div>
                  <div className="truncate text-foreground">{it.prize}</div>
                  {disabled && (
                    <div className="truncate text-[9px] text-muted-foreground/80">
                      {!isTradableTier(it.tier) ? "// locked: tier C" : `// pilih tier ${lockedTier}`}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {tierCCount > 0 && (
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-hacker-bg px-2 py-1.5 font-mono-hacker text-[10px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          {tierCCount} item Tier C terkunci dari trade (anti-farming).
        </div>
      )}
    </div>
  );
};

export default InventoryItemPicker;
