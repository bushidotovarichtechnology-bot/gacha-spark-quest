import { useState } from "react";
import { motion } from "framer-motion";
import { X, Recycle, PackageCheck, Coins, Minus, Plus, Crown, Star, Gift, Award, KeyRound, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabaseImg } from "@/lib/imageTransform";
import DigitalCodeCard from "@/components/DigitalCodeCard";
import DigitalBadge from "@/components/DigitalBadge";
import type { InventoryItem } from "@/context/GachaContext";


const tierMeta: Record<string, { color: string; icon: typeof Crown; gradient: string }> = {
  S: { color: "text-accent", icon: Crown, gradient: "from-accent/30 to-accent/5" },
  A: { color: "text-neon-purple", icon: Star, gradient: "from-primary/30 to-primary/5" },
  B: { color: "text-neon-pink", icon: Gift, gradient: "from-pink-500/20 to-pink-500/5" },
  C: { color: "text-muted-foreground", icon: Award, gradient: "from-muted/40 to-muted/10" },
};

interface Props {
  items: InventoryItem[]; // all units in this group (same prize/tier/campaign)
  onClose: () => void;
  onClaim: (item: InventoryItem) => void; // claim ONE unit
  onRecycle: (ids: string[]) => void; // recycle N units
}

const InventoryGroupModal = ({ items, onClose, onClaim, onRecycle }: Props) => {
  const total = items.length;
  const [qty, setQty] = useState(1);
  const [copiedAll, setCopiedAll] = useState(false);
  const sample = items[0];
  const meta = tierMeta[sample.tier] ?? tierMeta.C;
  const unitCoin = sample.coinValue;
  const digitalUnits = items.filter((i) => !!i.digitalCode);
  const isDigital = digitalUnits.length > 0;

  const setSafeQty = (n: number) => setQty(Math.max(1, Math.min(total, n)));

  const handleRecycle = () => {
    const ids = items.slice(0, qty).map((i) => i.id);
    onRecycle(ids);
  };

  const handleClaimOne = () => {
    onClaim(items[0]);
  };

  const handleCopyAll = async () => {
    try {
      const text = digitalUnits.map((u, idx) => `Unit #${idx + 1}: ${u.digitalCode}`).join("\n");
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      toast.success(`${digitalUnits.length} kode disalin ke clipboard!`);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      toast.error("Gagal menyalin kode");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-display text-base font-bold text-foreground">Detail Item</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Image + info */}
        <div className={`bg-gradient-to-b ${meta.gradient} p-4`}>
          <div className="relative mx-auto aspect-square max-w-[220px] overflow-hidden rounded-xl bg-background/40">
            <img
              src={supabaseImg(sample.image, 600)}
              alt={sample.prize}
              className="h-full w-full object-contain"
            />
            <div className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-background/80 font-display text-xs font-black ${meta.color}`}>
              {sample.tier}
            </div>
            <div className="absolute right-2 top-2 rounded-md bg-background/85 px-2 py-1 font-display text-xs font-bold text-foreground">
              ×{total}
            </div>
          </div>
          <div className="mt-3 text-center">
            <h3 className="font-display text-base font-bold text-foreground">{sample.prize}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{sample.campaign}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Total dimiliki: <span className="font-semibold text-foreground">{total} unit</span>
              {" · "}
              <span className="text-accent font-semibold">{unitCoin.toLocaleString()} koin/unit</span>
            </p>
          </div>
        </div>

        {/* Digital codes list (if any) */}
        {isDigital && (
          <div className="px-4 py-3 border-t border-border space-y-2 max-h-60 overflow-y-auto">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              Kode Voucher ({digitalUnits.length})
            </p>
            {digitalUnits.map((unit, idx) => (
              <DigitalCodeCard key={unit.id} code={unit.digitalCode!} prizeName={`Unit #${idx + 1}`} compact />
            ))}
          </div>
        )}

        {/* Quantity selector */}
        <div className="px-4 py-4 border-t border-border space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Pilih jumlah untuk daur ulang
            </p>
            <div className="flex items-center gap-3">
              <Button size="icon" variant="outline" className="h-10 w-10 shrink-0" onClick={() => setSafeQty(qty - 1)} disabled={qty <= 1}>
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="number"
                value={qty}
                onChange={(e) => setSafeQty(parseInt(e.target.value) || 1)}
                className="flex-1 h-10 rounded-md border border-input bg-background text-center font-display text-lg font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                min={1}
                max={total}
              />
              <Button size="icon" variant="outline" className="h-10 w-10 shrink-0" onClick={() => setSafeQty(qty + 1)} disabled={qty >= total}>
                <Plus className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="shrink-0 text-xs h-10 px-2" onClick={() => setSafeQty(total)}>
                Max
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Akan dapat:</span>
              <span className="font-bold text-accent flex items-center gap-1">
                +{(unitCoin * qty).toLocaleString()} <Coins className="h-3 w-3" />
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className={`grid gap-2 pt-2 ${isDigital ? "grid-cols-1" : "grid-cols-2"}`}>
            {!isDigital && (
              <Button variant="outline" onClick={handleClaimOne} className="gap-1.5 border-primary/50 hover:border-primary hover:text-primary">
                <PackageCheck className="h-4 w-4" />
                Klaim 1 unit
              </Button>
            )}
            <Button onClick={handleRecycle} className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90">
              <Recycle className="h-4 w-4" />
              Daur {qty}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {isDigital
              ? "Hadiah digital — kode sudah ada di atas. Daur ulang menukar unit menjadi koin."
              : "Klaim memproses 1 unit per pengiriman. Daur ulang dapat memilih beberapa unit sekaligus."}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InventoryGroupModal;
