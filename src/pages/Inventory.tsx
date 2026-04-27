import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Recycle, Crown, Star, Gift, Award, Package, Sparkles, PackageCheck, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square, XCircle, Ticket, KeyRound, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { useGacha, type InventoryItem } from "@/context/GachaContext";
import { useI18n } from "@/context/I18nContext";
import { formatDistanceToNow } from "date-fns";
import ClaimPrizeForm from "@/components/ClaimPrizeForm";
import InventoryGroupModal from "@/components/InventoryGroupModal";
import DigitalBadge from "@/components/DigitalBadge";
import { supabaseImg } from "@/lib/imageTransform";
import { getCopiedCodes, subscribeCopiedCodes } from "@/lib/copiedCodes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";

const tierMeta: Record<string, { color: string; icon: typeof Crown; gradient: string; label: string }> = {
  S: { color: "text-accent", icon: Crown, gradient: "from-accent/30 to-accent/5", label: "Grand Prize" },
  A: { color: "text-neon-purple", icon: Star, gradient: "from-primary/30 to-primary/5", label: "Tier A" },
  B: { color: "text-neon-pink", icon: Gift, gradient: "from-pink-500/20 to-pink-500/5", label: "Tier B" },
  C: { color: "text-muted-foreground", icon: Award, gradient: "from-muted/40 to-muted/10", label: "Tier C" },
};

const Inventory = () => {
  const { items, totalCoins, drawsSinceTierA, recycleItem, pityThreshold } = useGacha();
  const { t } = useI18n();
  const [filter, setFilter] = useState<"all" | "S" | "A" | "B" | "C" | "digital">("all");
  const [sortBy, setSortBy] = useState<"newest" | "coin_high" | "coin_low">("newest");
  const [copiedCodes, setCopiedCodes] = useState<Set<string>>(() => getCopiedCodes());

  useEffect(() => subscribeCopiedCodes(() => setCopiedCodes(getCopiedCodes())), []);

  const [claimingItem, setClaimingItem] = useState<InventoryItem | null>(null);
  const [recyclingItem, setRecyclingItem] = useState<InventoryItem | null>(null);
  const [bulkRecycleOpen, setBulkRecycleOpen] = useState(false);
  const [bulkRecycleTier, setBulkRecycleTier] = useState<"B" | "C" | "BC" | "selected">("C");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupModalKey, setGroupModalKey] = useState<string | null>(null);

  const filteredItems = (() => {
    let list: InventoryItem[];
    if (filter === "all") list = [...items];
    else if (filter === "digital") list = items.filter((i) => !!i.digitalCode);
    else list = items.filter((i) => i.tier === filter);
    switch (sortBy) {
      case "coin_high": list.sort((a, b) => b.coinValue - a.coinValue); break;
      case "coin_low": list.sort((a, b) => a.coinValue - b.coinValue); break;
      default: break; // already newest first from context
    }
    return list;
  })();

  // Group identical items: same prize + tier + campaign
  const groupKey = (it: InventoryItem) => `${it.campaignId}|${it.tier}|${it.prize}`;
  const groupedItems = (() => {
    const map = new Map<string, InventoryItem[]>();
    filteredItems.forEach((it) => {
      const k = groupKey(it);
      const arr = map.get(k);
      if (arr) arr.push(it); else map.set(k, [it]);
    });
    return Array.from(map.entries()).map(([key, list]) => ({ key, list }));
  })();
  const activeGroup = groupModalKey
    ? items.filter((i) => groupKey(i) === groupModalKey)
    : [];
  const pityProgress = Math.min((drawsSinceTierA / pityThreshold) * 100, 100);
  const recyclableTiers = ["B", "C"];
  const claimableTiers = ["S", "A"];

  const handleRecycle = (id: string, prizeName: string) => {
    const value = recycleItem(id);
    toast.success(t("recycledTitle", { name: prizeName }), {
      description: t("recycledDesc", { value }),
      icon: <Coins className="h-4 w-4 text-accent" />,
    });
  };

  const getBulkRecycleItems = () => {
    if (bulkRecycleTier === "selected") return items.filter((i) => selectedIds.has(i.id));
    if (bulkRecycleTier === "BC") return items.filter((i) => i.tier === "B" || i.tier === "C");
    return items.filter((i) => i.tier === bulkRecycleTier);
  };

  const handleBulkRecycle = () => {
    const toRecycle = getBulkRecycleItems();
    let totalValue = 0;
    toRecycle.forEach((item) => {
      totalValue += recycleItem(item.id);
    });
    toast.success(`${toRecycle.length} item berhasil didaur ulang!`, {
      description: `+${totalValue.toLocaleString()} koin diterima`,
      icon: <Coins className="h-4 w-4 text-accent" />,
    });
    setBulkRecycleOpen(false);
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const tierCounts = {
    S: items.filter((i) => i.tier === "S").length,
    A: items.filter((i) => i.tier === "A").length,
    B: items.filter((i) => i.tier === "B").length,
    C: items.filter((i) => i.tier === "C").length,
  };

  const digitalItems = items.filter((i) => !!i.digitalCode);
  const digitalCount = digitalItems.length;
  const uncopiedDigitalCount = digitalItems.filter((i) => i.digitalCode && !copiedCodes.has(i.digitalCode)).length;

  return (
    <div className="min-h-screen pb-8">
      <Navbar />
      <div className="container mx-auto px-4 pt-24">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("myInventory")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("yourCollection")} — kelola & trade prize hasil gacha kamu</p>
          </div>
          {(tierCounts.S + tierCounts.A + tierCounts.B) > 0 && (
            <div className="flex shrink-0 items-center gap-1.5">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      size="sm"
                      className="shrink-0 gap-1.5 border border-[hsl(var(--hacker-green)/0.4)] bg-[hsl(var(--hacker-bg))] font-mono-hacker text-xs text-[hsl(var(--hacker-green))] shadow-[0_0_12px_hsl(var(--hacker-green)/0.25)] hover:bg-[hsl(var(--hacker-green)/0.1)] hover:text-[hsl(var(--hacker-green))]"
                    >
                      <Link to="/trade/new" aria-label="Buka P2P Trade Hub">
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        <span>Trade Prize</span>
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                    Tukar prize hasil gacha kamu dengan pemain lain. Membuka P2P Trade Hub.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* Info popover — works on tap (mobile) where hover tooltip doesn't trigger */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Apa itu Trade Prize?"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="max-w-[260px] text-xs leading-relaxed">
                  <p className="font-semibold text-foreground">Trade Prize</p>
                  <p className="mt-1 text-muted-foreground">
                    Tukar prize hasil gacha kamu dengan pemain lain. Tombol ini membuka P2P Trade Hub di <code className="text-foreground">/trade/new</code>.
                  </p>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Package className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="font-display text-xl font-bold text-foreground">{items.length}</p>
            <p className="text-xs text-muted-foreground">{t("totalItems")}</p>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-center box-glow-gold">
            <Coins className="mx-auto mb-1 h-5 w-5 text-accent" />
            <p className="font-display text-xl font-bold text-accent">{totalCoins.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{t("bushidoCoins")}</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center">
            <Star className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="font-display text-xl font-bold text-foreground">{tierCounts.A + tierCounts.S}</p>
            <p className="text-xs text-muted-foreground">{t("rareItems")}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <Recycle className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <p className="font-display text-xl font-bold text-foreground">{tierCounts.B + tierCounts.C}</p>
            <p className="text-xs text-muted-foreground">{t("recyclable")}</p>
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
              <span className="font-display text-xs font-semibold uppercase tracking-wider text-primary">{t("pityCounter")}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{pityThreshold - drawsSinceTierA}</span> {t("moreDrawsForTierA")}
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
            <span>{drawsSinceTierA} {t("draws")}</span>
            <span>{pityThreshold} {t("draws")}</span>
          </div>
        </motion.div>

        {/* Filter & Sort */}
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
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
                  {f === "all" ? t("all") : f === "S" ? t("grand") : `${t("tierA").split(" ")[0]} ${f}`}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-primary-foreground/20" : "bg-background/40"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
            {digitalCount > 0 && (() => {
              const active = filter === "digital";
              return (
                <button
                  onClick={() => setFilter("digital")}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-primary text-primary-foreground box-glow-purple"
                      : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15"
                  }`}
                  aria-label="Filter hadiah digital"
                >
                  <KeyRound className="h-3 w-3" />
                  Digital
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-primary-foreground/20" : "bg-background/40"}`}>
                    {digitalCount}
                  </span>
                  {uncopiedDigitalCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground shadow ring-2 ring-background"
                      title={`${uncopiedDigitalCount} kode belum disalin`}
                    >
                      {uncopiedDigitalCount}
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
          <div className="flex gap-1.5">
            {([
              { key: "newest", label: "Terbaru", icon: ArrowUpDown },
              { key: "coin_high", label: "Koin ↑", icon: ArrowUp },
              { key: "coin_low", label: "Koin ↓", icon: ArrowDown },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                  sortBy === key
                    ? "bg-accent/15 text-accent border border-accent/30"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Recycle */}
        {items.length > 0 && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/5 px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Recycle className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground">Daur ulang massal:</span>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {tierCounts.C > 0 && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-accent/30 hover:border-accent hover:text-accent"
                    onClick={() => { setBulkRecycleTier("C"); setBulkRecycleOpen(true); }}>
                    Tier C ({tierCounts.C})
                  </Button>
                )}
                {tierCounts.B > 0 && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-accent/30 hover:border-accent hover:text-accent"
                    onClick={() => { setBulkRecycleTier("B"); setBulkRecycleOpen(true); }}>
                    Tier B ({tierCounts.B})
                  </Button>
                )}
                {tierCounts.B > 0 && tierCounts.C > 0 && (
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs border-accent/30 hover:border-accent hover:text-accent"
                    onClick={() => { setBulkRecycleTier("BC"); setBulkRecycleOpen(true); }}>
                    B + C ({tierCounts.B + tierCounts.C})
                  </Button>
                )}
                <Button size="sm" variant={selectMode ? "default" : "outline"}
                  className={`h-7 gap-1 text-xs ${selectMode ? "" : "border-primary/30 hover:border-primary hover:text-primary"}`}
                  onClick={() => { setSelectMode(!selectMode); if (selectMode) clearSelection(); }}>
                  <CheckSquare className="h-3 w-3" />
                  {selectMode ? "Batal Pilih" : "Pilih Item"}
                </Button>
              </div>
            </div>

            {/* Selection toolbar */}
            {selectMode && (
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{selectedIds.size}</span> item dipilih
                  </span>
                  {selectedIds.size > 0 && (
                    <span className="text-accent font-medium text-xs">
                      +{items.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + i.coinValue, 0).toLocaleString()} koin
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={selectAllFiltered}>
                    Pilih Semua
                  </Button>
                  {selectedIds.size > 0 && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelection}>
                        <XCircle className="h-3 w-3 mr-1" /> Hapus Pilihan
                      </Button>
                      <Button size="sm" className="h-7 text-xs gap-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={() => { setBulkRecycleTier("selected"); setBulkRecycleOpen(true); }}>
                        <Recycle className="h-3 w-3" /> Daur Ulang ({selectedIds.size})
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:gap-4">
          <AnimatePresence mode="popLayout">
            {groupedItems.map(({ key, list }) => {
              const item = list[0];
              const meta = tierMeta[item.tier];
              const count = list.length;
              const totalCoinValue = list.reduce((s, i) => s + i.coinValue, 0);
              const timeAgo = (() => {
                try { return formatDistanceToNow(new Date(item.wonAt), { addSuffix: true }); }
                catch { return item.wonAt; }
              })();
              // Selection state for groups: count how many of this group are selected
              const selectedInGroup = list.filter((i) => selectedIds.has(i.id)).length;
              const allSelected = selectedInGroup === count;
              const someSelected = selectedInGroup > 0 && !allSelected;

              const handleGroupClick = () => {
                if (selectMode) {
                  // Toggle: if all selected -> unselect all; else select all
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (allSelected) {
                      list.forEach((i) => next.delete(i.id));
                    } else {
                      list.forEach((i) => next.add(i.id));
                    }
                    return next;
                  });
                } else {
                  setGroupModalKey(key);
                }
              };

              return (
                <motion.div
                  key={key}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25 }}
                  onClick={handleGroupClick}
                  className={`group cursor-pointer overflow-hidden rounded-xl border bg-gradient-to-b ${meta.gradient} transition-all hover:border-primary/40 ${
                    allSelected ? "border-accent ring-2 ring-accent/30" : someSelected ? "border-accent/60" : "border-border/50"
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={supabaseImg(item.image, 400)}
                      alt={item.prize}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain opacity-70 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    <div className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-background/80 font-display text-xs font-black ${meta.color}`}>
                      {item.tier}
                    </div>
                    {item.campaignId === "redeem-store" && (
                      <div className="absolute left-2 top-11 flex items-center gap-1 rounded-md bg-primary/90 px-1.5 py-0.5">
                        <Ticket className="h-3 w-3 text-primary-foreground" />
                        <span className="text-[9px] font-bold text-primary-foreground">TIKET</span>
                      </div>
                    )}
                    {item.digitalCode && (
                      <div className="absolute left-2 top-11">
                        <DigitalBadge />
                      </div>
                    )}
                    {/* Quantity badge */}
                    {count > 1 && (
                      <div className="absolute right-2 top-2 rounded-md bg-background/90 px-2 py-0.5 font-display text-xs font-bold text-foreground border border-border/50 shadow-sm">
                        ×{count}
                      </div>
                    )}
                    {selectMode && (
                      <div className="absolute right-2 bottom-2">
                        {allSelected
                          ? <CheckSquare className="h-6 w-6 text-accent drop-shadow-md" />
                          : someSelected
                            ? <CheckSquare className="h-6 w-6 text-accent/60 drop-shadow-md" />
                            : <Square className="h-6 w-6 text-muted-foreground/60 drop-shadow-md" />
                        }
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="mb-0.5 truncate font-display text-xs font-semibold text-foreground">
                      {item.prize}
                    </h3>
                    <p className="mb-2 truncate text-[10px] text-muted-foreground">
                      {count > 1 ? `${count} unit · ` : ""}{item.campaign}
                    </p>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">{timeAgo}</span>
                      <span className="flex items-center gap-1 font-semibold text-accent">
                        <Coins className="h-3 w-3" />
                        {count > 1 ? `${totalCoinValue.toLocaleString()}` : item.coinValue.toLocaleString()}
                      </span>
                    </div>
                    {item.digitalCode ? (
                      <div className="mt-2 flex items-center justify-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1.5 text-[10px] font-semibold text-primary">
                        <KeyRound className="h-3 w-3" />
                        {count > 1 ? `Lihat ${count} kode voucher` : "Lihat kode voucher"}
                      </div>
                    ) : (
                      <p className="mt-2 text-center text-[10px] font-medium text-primary/80">
                        Klik untuk klaim / daur ulang
                      </p>
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
              {items.length === 0 ? t("noPrizesYet") : t("noItemsCategory")}
            </p>
          </div>
        )}
      </div>

      {/* Group detail modal */}
      <AnimatePresence>
        {groupModalKey && activeGroup.length > 0 && (
          <InventoryGroupModal
            items={activeGroup}
            onClose={() => setGroupModalKey(null)}
            onClaim={(it) => {
              setGroupModalKey(null);
              setClaimingItem(it);
            }}
            onRecycle={(ids) => {
              let total = 0;
              ids.forEach((id) => { total += recycleItem(id); });
              toast.success(`${ids.length} unit didaur ulang`, {
                description: `+${total.toLocaleString()} koin diterima`,
                icon: <Coins className="h-4 w-4 text-accent" />,
              });
              setGroupModalKey(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Claim Prize Modal */}
      <AnimatePresence>
        {claimingItem && (
          <ClaimPrizeForm
            item={claimingItem}
            onClose={() => setClaimingItem(null)}
            onClaimed={(itemId) => {
              recycleItem(itemId);
              setClaimingItem(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Recycle Confirmation Dialog */}
      <AlertDialog open={!!recyclingItem} onOpenChange={(open) => !open && setRecyclingItem(null)}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <AlertTriangle className="h-6 w-6 text-accent" />
            </div>
            <AlertDialogTitle className="text-center font-display">
              {t("recycleConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {recyclingItem && (
                <>
                  <span className="font-semibold text-foreground">{recyclingItem.prize}</span>
                  <span className="text-muted-foreground"> ({recyclingItem.tier})</span>
                  <br />
                  {t("recycleConfirmDesc", { value: recyclingItem?.coinValue ?? 0 })}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="border-border">{t("back")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => {
                if (recyclingItem) {
                  handleRecycle(recyclingItem.id, recyclingItem.prize);
                  setRecyclingItem(null);
                }
              }}
            >
              <Recycle className="mr-1.5 h-4 w-4" />
              {t("recycle")} · +{recyclingItem?.coinValue ?? 0} <Coins className="ml-1 h-3.5 w-3.5" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Recycle Confirmation Dialog */}
      <AlertDialog open={bulkRecycleOpen} onOpenChange={setBulkRecycleOpen}>
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <Recycle className="h-6 w-6 text-accent" />
            </div>
            <AlertDialogTitle className="text-center font-display">
              Daur Ulang Massal
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {(() => {
                const bulkItems = getBulkRecycleItems();
                const totalVal = bulkItems.reduce((s, i) => s + i.coinValue, 0);
                const tierLabel = bulkRecycleTier === "selected" ? "yang dipilih" : bulkRecycleTier === "BC" ? "Tier B & C" : `Tier ${bulkRecycleTier}`;
                return (
                  <>
                    Daur ulang <span className="font-semibold text-foreground">{bulkItems.length} item {tierLabel}</span> sekaligus?
                    <br />
                    Kamu akan mendapatkan <span className="font-semibold text-accent">+{totalVal.toLocaleString()} koin</span>.
                    <br />
                    <span className="text-destructive text-xs mt-1 block">Tindakan ini tidak bisa dibatalkan.</span>
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="border-border">{t("back")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={handleBulkRecycle}
            >
              <Recycle className="mr-1.5 h-4 w-4" />
              Daur Ulang {getBulkRecycleItems().length} Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Inventory;
