import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Coins, Sparkles, Zap, Crown, ArrowLeft, Check, Loader2 } from "lucide-react";
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

declare global {
  interface Window {
    snap: {
      pay: (token: string, options: {
        onSuccess?: (result: any) => void;
        onPending?: (result: any) => void;
        onError?: (result: any) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Coins,
  Zap,
  Sparkles,
  Crown,
};

type CoinPackage = {
  id: string;
  name: string;
  coins: number;
  price: number;
  icon: string;
  is_popular: boolean;
};

const TopUp = () => {
  const { addCoins } = useGacha();
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [midtransReady, setMidtransReady] = useState(false);
  const [coinPackages, setCoinPackages] = useState<CoinPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase
        .from("coin_packages")
        .select("id, name, coins, price, icon, is_popular")
        .eq("is_active", true)
        .order("sort_order");
      setCoinPackages((data as CoinPackage[]) || []);
      setLoadingPackages(false);
    };
    fetchPackages();
  }, []);

  useEffect(() => {
    const checkSnap = setInterval(() => {
      if (window.snap) {
        setMidtransReady(true);
        clearInterval(checkSnap);
      }
    }, 500);
    return () => clearInterval(checkSnap);
  }, []);

  const handlePurchase = async () => {
    if (!selectedPackage || !user) return;
    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-midtrans-token", {
        body: {
          package_id: selectedPackage.id,
          coins: selectedPackage.coins,
          amount: selectedPackage.price,
        },
      });

      if (error || !data?.token) {
        throw new Error(error?.message || "Failed to create payment");
      }

      if (data.client_key) {
        const script = document.querySelector('script[src*="midtrans"]') as HTMLScriptElement;
        if (script) {
          script.setAttribute("data-client-key", data.client_key);
        }
      }

      const pkg = selectedPackage;
      setSelectedPackage(null);

      window.snap.pay(data.token, {
        onSuccess: () => {
          addCoins(pkg.coins);
          toast({
            title: t("purchaseSuccess"),
            description: t("purchaseSuccessDesc", { coins: pkg.coins.toLocaleString() }),
          });
        },
        onPending: () => {
          toast({
            title: "Pembayaran Pending",
            description: "Silakan selesaikan pembayaran Anda. Koin akan ditambahkan setelah pembayaran dikonfirmasi.",
          });
        },
        onError: () => {
          toast({
            title: "Pembayaran Gagal",
            description: "Terjadi kesalahan saat memproses pembayaran.",
            variant: "destructive",
          });
        },
        onClose: () => {
          console.log("Payment popup closed");
        },
      });
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({
        title: "Error",
        description: err.message || "Gagal memproses pembayaran",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToCampaigns")}
        </Link>

        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-wider text-foreground">
            {t("topUpCoins")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("topUpDesc")}</p>
        </div>

        {loadingPackages ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {coinPackages.map((pkg, i) => {
              const Icon = ICON_MAP[pkg.icon] || Coins;
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`relative cursor-pointer rounded-xl border-2 p-6 text-center transition-all hover:scale-105 ${
                    pkg.is_popular
                      ? "border-accent bg-accent/5 box-glow-gold"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedPackage(pkg)}
                >
                  {pkg.is_popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-accent-foreground">
                      {t("bestValue")}
                    </span>
                  )}
                  <Icon
                    className={`mx-auto h-10 w-10 ${
                      pkg.is_popular ? "text-accent" : "text-primary"
                    }`}
                  />
                  <div className="mt-4 font-display text-2xl font-bold text-foreground">
                    {pkg.coins.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">{t("gachaCoins")}</div>
                  <div className="mt-4 text-lg font-semibold text-foreground">
                    {formatRupiah(pkg.price)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatRupiah(Math.round(pkg.price / pkg.coins))}/{t("perCoin")}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="mx-auto mt-10 max-w-md text-center">
          <p className="text-xs text-muted-foreground">{t("paymentMethods")}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {["GoPay", "OVO", "DANA", "ShopeePay", "BCA VA", "BRI VA", "QRIS", "Credit Card"].map(
              (m) => (
                <span
                  key={m}
                  className="rounded-md border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {m}
                </span>
              )
            )}
          </div>
        </div>
      </main>

      <Dialog
        open={!!selectedPackage}
        onOpenChange={(open) => !open && setSelectedPackage(null)}
      >
        <DialogContent className="border-border bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              {t("confirmPurchase")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("confirmPurchaseDesc")}
            </DialogDescription>
          </DialogHeader>
          {selectedPackage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-secondary p-4">
                <div className="flex items-center gap-3">
                  <Coins className="h-6 w-6 text-accent" />
                  <div>
                    <div className="font-display font-bold text-foreground">
                      {selectedPackage.coins.toLocaleString()} {t("gachaCoins")}
                    </div>
                  </div>
                </div>
                <div className="font-semibold text-foreground">
                  {formatRupiah(selectedPackage.price)}
                </div>
              </div>
              <Button
                variant="gold"
                className="w-full"
                onClick={handlePurchase}
                disabled={processing}
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("processing")}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    {t("payNow")}
                  </span>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Pembayaran diproses melalui Midtrans
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TopUp;
