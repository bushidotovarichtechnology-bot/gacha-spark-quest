import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Recycle, Crown, Star, Gift, Award, Package, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useGacha } from "@/context/GachaContext";
import { useI18n } from "@/context/I18nContext";
import { formatDistanceToNow } from "date-fns";

const tierMeta: Record<string, { color: string; icon: typeof Crown; gradient: string; label: string }> = {
  S: { color: "text-accent", icon: Crown, gradient: "from-accent/30 to-accent/5", label: "Grand Prize" },
  A: { color: "text-neon-purple", icon: Star, gradient: "from-primary/30 to-primary/5", label: "Tier A" },
  B: { color: "text-neon-pink", icon: Gift, gradient: "from-pink-500/20 to-pink-500/5", label: "Tier B" },
  C: { color: "text-muted-foreground", icon: Award, gradient: "from-muted/40 to-muted/10", label: "Tier C" },
};

const Inventory = () => {
  const { items, totalCoins, drawsSinceTierA, recycleItem, pityThreshold } = useGacha();
  const { t } = useI18n();
  const [filter, setFilter] = useState<"all" | "S" | "A" | "B" | "C">("all");

  const filteredItems = filter === "all" ? items : items.filter((i) => i.tier === filter);
  const pityProgress = Math.min((drawsSinceTierA / pityThreshold) * 100, 100);
  const recyclableTiers = ["B", "C"];

  const handleRecycle = (id: string, prizeName: string) => {
    const value = recycleItem(id);
    toast.success(t("recycledTitle", { name: prizeName }), {
      description: t("recycledDesc", { value }),
      icon: <Coins className="h-4 w-4 text-accent" />,
    });
  };

  const tierCounts = {
    S: items.filter((i) => i.tier === "S").length,
    A: items.filter((i) => i.tier === "A").length,
    B: items.filter((i) => i.tier === "B").length,
    C: items.filter((i) => i.tier === "C").length,
  };

  return (
    <div className="min-h-screen pb-8">
      <Navbar />
      <div className="container mx-auto px-4 pt-24">
        <div className="mb-8">
          <h1 className="mb-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My Inventory
          </h1>
          <p className="text-sm text-muted-foreground">Your collection of prizes from Bushido Gacha draws.</p>
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Package className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="font-display text-xl font-bold text-foreground">{items.length}</p>
            <p className="text-xs text-muted-foreground">Total Items</p>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-center box-glow-gold">
            <Coins className="mx-auto mb-1 h-5 w-5 text-accent" />
            <p className="font-display text-xl font-bold text-accent">{totalCoins.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Gacha Coins</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center">
            <Star className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="font-display text-xl font-bold text-foreground">{tierCounts.A + tierCounts.S}</p>
            <p className="text-xs text-muted-foreground">Rare+ Items</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Recycle className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <p className="font-display text-xl font-bold text-foreground">{tierCounts.B + tierCounts.C}</p>
            <p className="text-xs text-muted-foreground">Recyclable</p>
          </div>
        </div>

        {/* Pity Counter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-xl border border-primary/30 bg-primary/5 p-4 box-glow-purple"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-display text-xs font-semibold uppercase tracking-wider text-primary">
                Pity Counter
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{pityThreshold - drawsSinceTierA}</span> more draws for guaranteed Tier A!
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-background/50">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${pityProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
            <span>{drawsSinceTierA} draws</span>
            <span>{pityThreshold} draws</span>
          </div>
        </motion.div>

        {/* Filter tabs */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {(["all", "S", "A", "B", "C"] as const).map((f) => {
            const active = filter === f;
            const count = f === "all" ? items.length : tierCounts[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground box-glow-purple"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f === "S" ? "Grand" : `Tier ${f}`}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-primary-foreground/20" : "bg-background/40"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:gap-4">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              const meta = tierMeta[item.tier];
              const canRecycle = recyclableTiers.includes(item.tier);
              const timeAgo = (() => {
                try { return formatDistanceToNow(new Date(item.wonAt), { addSuffix: true }); }
                catch { return item.wonAt; }
              })();
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25 }}
                  className={`group overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b ${meta.gradient} transition-all hover:border-primary/40`}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.prize}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-60 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    <div className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-background/80 font-display text-xs font-black ${meta.color}`}>
                      {item.tier}
                    </div>
                  </div>

                  <div className="p-3">
                    <h3 className="mb-0.5 truncate font-display text-xs font-semibold text-foreground">
                      {item.prize}
                    </h3>
                    <p className="mb-2 truncate text-[10px] text-muted-foreground">{item.campaign} · {timeAgo}</p>

                    {canRecycle ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecycle(item.id, item.prize)}
                        className="w-full gap-1.5 border-border/50 text-xs hover:border-accent/50 hover:text-accent"
                      >
                        <Recycle className="h-3 w-3" />
                        Recycle · +{item.coinValue}
                        <Coins className="h-3 w-3 text-accent" />
                      </Button>
                    ) : (
                      <div className={`flex items-center justify-center gap-1.5 rounded-md bg-background/30 py-1.5 text-xs font-semibold ${meta.color}`}>
                        <meta.icon className="h-3 w-3" />
                        {meta.label}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="font-display text-sm text-muted-foreground">
              {items.length === 0 ? "No prizes yet — go draw some!" : "No items in this category"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
