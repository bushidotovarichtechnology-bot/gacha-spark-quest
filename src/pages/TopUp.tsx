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

const coinPackages = [
  { id: "starter", coins: 100, price: 15000, icon: Coins, popular: false },
  { id: "value", coins: 500, price: 65000, icon: Zap, popular: true },
  { id: "premium", coins: 1200, price: 130000, icon: Sparkles, popular: false },
  { id: "whale", coins: 3000, price: 280000, icon: Crown, popular: false },
];

const TopUp = () => {
  const { addCoins } = useGacha();
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState<typeof coinPackages[0] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [midtransReady, setMidtransReady] = useState(false);

  useEffect(() => {
    // Set client key on snap script
    const script = document.querySelector('script[src*="midtrans"]') as HTMLScriptElement;
    if (script) {
      const clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY;
      if (clientKey) {
        script.setAttribute("data-client-key", clientKey);
      }
      // Check if snap is ready
      const checkSnap = setInterval(() => {
        if (window.snap) {
          setMidtransReady(true);
          clearInterval(checkSnap);
        }
      }, 500);
      return () => clearInterval(checkSnap);
    }
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

      setSelectedPackage(null);

      // Open Midtrans Snap popup
      window.snap.pay(data.token, {
        onSuccess: (result: any) => {
          addCoins(selectedPackage.coins);
          toast({
            title: t("purchaseSuccess"),
            description: t("purchaseSuccessDesc", {
              coins: selectedPackage.coins.toLocaleString(),
            }),
          });
        },
        onPending: (result: any) => {
          toast({
            title: "Pembayaran Pending",
            description: "Silakan selesaikan pembayaran Anda. Koin akan ditambahkan setelah pembayaran dikonfirmasi.",
          });
        },
        onError: (result: any) => {
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

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {coinPackages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative cursor-pointer rounded-xl border-2 p-6 text-center transition-all hover:scale-105 ${
                pkg.popular
                  ? "border-accent bg-accent/5 box-glow-gold"
                  : "border-border bg-card hover:border-primary/50"
              }`}
              onClick={() => setSelectedPackage(pkg)}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-0.5 text-xs font-bold text-accent-foreground">
                  {t("bestValue")}
                </span>
              )}
              <pkg.icon
                className={`mx-auto h-10 w-10 ${
                  pkg.popular ? "text-accent" : "text-primary"
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
          ))}
        </div>

        {/* Payment methods info */}
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

      {/* Confirm dialog */}
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
