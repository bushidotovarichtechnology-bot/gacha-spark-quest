import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coins, Sparkles, Zap, Crown, ArrowLeft, Check, Loader2, Gift, Percent, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useGacha } from "@/context/GachaContext";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PaymentInstructionDialog, type PaymentInstructionData } from "@/components/PaymentInstructionDialog";

const ICON_MAP: Record<string, React.ComponentType<any>> = { Coins, Zap, Sparkles, Crown };

// Kode channel harus sama persis dengan spesifikasi Violet Media Pay
// (lihat https://violetmediapay.com/dokumentasi/ – Daftar Channel Pembayaran).
const PAYMENT_CHANNEL_GROUPS: { label: string; channels: { code: string; label: string }[] }[] = [
  {
    label: "QRIS",
    channels: [{ code: "QRIS", label: "QRIS" }],
  },
  {
    label: "Virtual Account",
    channels: [
      { code: "BCAVA", label: "BCA" },
      { code: "BNIVA", label: "BNI" },
      { code: "BRIVA", label: "BRI" },
      { code: "MANDIRIVA", label: "Mandiri" },
      { code: "PERMATAVA", label: "Permata" },
      { code: "CIMBNIAGA", label: "CIMB Niaga" },
      { code: "BSI", label: "BSI" },
      { code: "DANAMON", label: "Danamon" },
    ],
  },
  {
    label: "E-Wallet",
    channels: [
      { code: "OVO", label: "OVO" },
      { code: "DANA", label: "DANA" },
      { code: "Shopee Pay", label: "ShopeePay" },
      { code: "Link Aja", label: "LinkAja" },
    ],
  },
  {
    label: "Convenience Store",
    channels: [{ code: "ALFAMART", label: "Alfamart" }],
  },
];

type CoinPackage = {
  id: string;
  name: string;
  coins: number;
  price: number;
  icon: string;
  is_popular: boolean;
  discount_percent: number;
  discount_start: string | null;
  discount_end: string | null;
  bonus_coins: number;
  bonus_label: string;
};

const isPromoActive = (pkg: CoinPackage) => {
  if (!pkg.discount_percent) return false;
  const now = new Date();
  if (pkg.discount_start && new Date(pkg.discount_start) > now) return false;
  if (pkg.discount_end && new Date(pkg.discount_end) < now) return false;
  return true;
};

const getDiscountedPrice = (pkg: CoinPackage) =>
  isPromoActive(pkg) ? Math.round(pkg.price * (1 - pkg.discount_percent / 100)) : pkg.price;

const getPaymentErrorMessage = async (error: unknown, fallback: string) => {
  const context = (error as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();
      return payload?.user_message || payload?.error || fallback;
    } catch {
      return fallback;
    }
  }
  return (error as { message?: string } | null)?.message || fallback;
};

const useCountdown = (endTime: string | null) => {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!endTime) return;
    const calculateTimeLeft = () => {
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const diff = end - now;
      if (diff <= 0) { setTimeLeft(""); return; }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      if (days > 0) setTimeLeft(`${days}h ${hours}j ${minutes}m`);
      else if (hours > 0) setTimeLeft(`${hours}j ${minutes}m ${seconds}d`);
      else setTimeLeft(`${minutes}m ${seconds}d`);
    };
    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return timeLeft;
};

const TopUp = () => {
  useGacha();
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string>("QRIS");
  const [instructionData, setInstructionData] = useState<PaymentInstructionData | null>(null);

  useEffect(() => {
    supabase
      .from("coin_packages")
      .select("id, name, coins, price, icon, is_popular, discount_percent, discount_start, discount_end, bonus_coins, bonus_label")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setCoinPackages((data as CoinPackage[]) || []);
        setLoadingPackages(false);
      });
  }, []);

  const handlePurchase = async () => {
    if (!selectedPackage || !user) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-violet-checkout", {
        body: {
          package_id: selectedPackage.id,
          return_url: `${window.location.origin}/transactions`,
          channel_payment: selectedChannel,
        },
      });
      if (error || !data || data?.error) {
        const description = await getPaymentErrorMessage(error, data?.user_message || "Gagal membuat sesi pembayaran");
        toast({ title: "Pembayaran belum siap", description, variant: "destructive" });
        return;
      }
      setSelectedPackage(null);
      setInstructionData({
        order_id: data.order_id,
        amount: data.amount ?? 0,
        channel: data.channel ?? selectedChannel,
        instruction: data.instruction ?? { payment_url: data.redirect_url ?? null },
      });
    } catch (err: any) {
      console.error("Payment error:", err);
      const description = await getPaymentErrorMessage(err, "Gagal memproses pembayaran");
      toast({ title: "Error", description, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  const maxPrice = coinPackages.length ? Math.max(...coinPackages.map((p) => p.price)) : 0;
  const CoinPackageCard = ({ pkg, index, onSelect }: { pkg: CoinPackage; index: number; onSelect: (pkg: CoinPackage) => void }) => {
    const isBestValue = pkg.price === maxPrice && coinPackages.length > 1;
    const Icon = ICON_MAP[pkg.icon] || Coins;
    const promo = isPromoActive(pkg);
    const finalPrice = getDiscountedPrice(pkg);
    const totalCoins = pkg.coins + pkg.bonus_coins;
    const countdown = useCountdown(promo ? pkg.discount_end : null);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`relative cursor-pointer rounded-xl border-2 p-6 text-center transition-all hover:scale-105 ${
          isBestValue
            ? "border-accent bg-accent/5 box-glow-gold animate-pulse-glow ring-2 ring-accent/50 shadow-[0_0_30px_rgba(250,204,21,0.3)]"
            : pkg.is_popular
              ? "border-accent bg-accent/5 box-glow-gold"
              : "border-border bg-card hover:border-primary/50"
        }`}
        onClick={() => onSelect(pkg)}
      >
        {isBestValue && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-accent-foreground whitespace-nowrap shadow-lg animate-pulse">
            ⭐ BEST VALUE
          </span>
        )}
        {pkg.is_popular && !isBestValue && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground whitespace-nowrap">
            POPULER
          </span>
        )}
        {promo && (
          <span className="absolute -top-3 right-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground flex items-center gap-1">
            <Percent className="h-3 w-3" /> {pkg.discount_percent}%
          </span>
        )}

        <Icon className={`mx-auto h-10 w-10 ${pkg.is_popular ? "text-accent" : "text-primary"}`} />

        <div className="mt-4 font-display text-2xl font-bold text-foreground">
          {pkg.coins.toLocaleString()}
        </div>
        {pkg.bonus_coins > 0 && (
          <div className="flex items-center justify-center gap-1 text-xs font-medium text-accent">
            <Gift className="h-3 w-3" />
            +{pkg.bonus_coins.toLocaleString()} bonus
          </div>
        )}
        <div className="text-sm text-muted-foreground">{t("bushidoCoins")}</div>

        <div className="mt-4">
          {promo ? (
            <>
              <div className="text-xs text-muted-foreground line-through">{formatRupiah(pkg.price)}</div>
              <div className="text-lg font-semibold text-primary">{formatRupiah(finalPrice)}</div>
            </>
          ) : (
            <div className="text-lg font-semibold text-foreground">{formatRupiah(finalPrice)}</div>
          )}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatRupiah(Math.round(finalPrice / totalCoins))}/{t("perCoin")}
        </div>

        {promo && countdown && (
          <div className="mt-3 flex items-center justify-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            <Clock className="h-3 w-3" />
            {countdown}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("backToCampaigns")}
        </Link>

        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-wider text-foreground">{t("topUpCoins")}</h1>
          <p className="mt-2 text-muted-foreground">{t("topUpDesc")}</p>
        </div>

        {loadingPackages ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {coinPackages.map((pkg, i) => <CoinPackageCard key={pkg.id} pkg={pkg} index={i} onSelect={setSelectedPackage} />)}
          </div>
        )}

        <div className="mx-auto mt-10 max-w-md text-center">
          <p className="text-xs text-muted-foreground">{t("paymentMethods")}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {["QRIS", "Virtual Account", "E-Wallet", "Kartu Kredit"].map((m) => (
              <span key={m} className="rounded-md border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{m}</span>
            ))}
          </div>
        </div>
      </main>

      <Dialog open={!!selectedPackage} onOpenChange={(open) => !open && setSelectedPackage(null)}>
        <DialogContent className="border-border bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">{t("confirmPurchase")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{t("confirmPurchaseDesc")}</DialogDescription>
          </DialogHeader>
          {selectedPackage && (() => {
            const promo = isPromoActive(selectedPackage);
            const finalPrice = getDiscountedPrice(selectedPackage);
            const totalCoins = selectedPackage.coins + selectedPackage.bonus_coins;
            return (
              <div className="space-y-4">
                <div className="rounded-lg bg-secondary p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Coins className="h-6 w-6 text-accent" />
                      <div>
                        <div className="font-display font-bold text-foreground">
                          {selectedPackage.coins.toLocaleString()} {t("bushidoCoins")}
                        </div>
                        {selectedPackage.bonus_coins > 0 && (
                          <div className="text-xs text-accent flex items-center gap-1">
                            <Gift className="h-3 w-3" /> +{selectedPackage.bonus_coins.toLocaleString()} bonus {selectedPackage.bonus_label && `(${selectedPackage.bonus_label})`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {promo && <div className="text-xs text-muted-foreground line-through">{formatRupiah(selectedPackage.price)}</div>}
                      <div className={`font-semibold ${promo ? "text-green-400" : "text-foreground"}`}>{formatRupiah(finalPrice)}</div>
                    </div>
                  </div>
                  {(promo || selectedPackage.bonus_coins > 0) && (
                    <div className="border-t border-border/50 pt-2 text-xs text-muted-foreground">
                      Total koin: <span className="font-medium text-foreground">{totalCoins.toLocaleString()}</span>
                      {promo && <> • Hemat <span className="text-green-400">{formatRupiah(selectedPackage.price - finalPrice)}</span></>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Pilih metode pembayaran</div>
                  {PAYMENT_CHANNEL_GROUPS.map((group) => (
                    <div key={group.label} className="space-y-1">
                      <div className="text-xs font-medium text-muted-foreground">{group.label}</div>
                      <div className="flex flex-wrap gap-2">
                        {group.channels.map((ch) => (
                          <button
                            key={ch.code}
                            type="button"
                            onClick={() => setSelectedChannel(ch.code)}
                            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                              selectedChannel === ch.code
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-secondary text-muted-foreground hover:border-primary/50 hover:text-foreground"
                            }`}
                          >
                            {ch.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Button variant="gold" className="w-full" onClick={handlePurchase} disabled={processing}>
                  {processing ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />{t("processing")}</span>
                  ) : (
                    <span className="flex items-center gap-2"><Check className="h-4 w-4" />{t("payNow")}</span>
                  )}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Pembayaran diproses melalui Violet Media Pay
                </p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <PaymentInstructionDialog
        data={instructionData}
        open={!!instructionData}
        onOpenChange={(open) => !open && setInstructionData(null)}
      />
    </div>
  );
};

export default TopUp;
