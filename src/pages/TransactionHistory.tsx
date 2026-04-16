import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Receipt, Clock, CheckCircle, XCircle, AlertCircle, Coins, RefreshCw, Loader2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/context/I18nContext";
import { useGacha } from "@/context/GachaContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Transaction {
  id: string;
  order_id: string;
  package_id: string;
  coins: number;
  amount: number;
  status: string;
  payment_type: string | null;
  snap_token: string | null;
  created_at: string;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  settlement: { icon: CheckCircle, color: "text-green-500", label: "Berhasil" },
  pending: { icon: Clock, color: "text-yellow-500", label: "Menunggu" },
  expire: { icon: AlertCircle, color: "text-muted-foreground", label: "Kedaluwarsa" },
  cancel: { icon: XCircle, color: "text-red-500", label: "Dibatalkan" },
  deny: { icon: XCircle, color: "text-red-500", label: "Ditolak" },
  refund: { icon: AlertCircle, color: "text-orange-500", label: "Refund" },
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

const canRetry = (status: string) => ["expire", "cancel", "deny"].includes(status);

const TransactionHistory = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const { refreshCoins } = useGacha();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const prevStatusRef = useRef<Record<string, string>>({});

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      const txs = data as unknown as Transaction[];
      setTransactions(txs);
      const statusMap: Record<string, string> = {};
      txs.forEach((tx) => { statusMap[tx.id] = tx.status; });
      prevStatusRef.current = statusMap;
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions();
    refreshCoins?.();
    toast.success("Data transaksi diperbarui");
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      await fetchTransactions();
      setLoading(false);
    };
    load();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("user-transactions")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions" },
        (payload) => {
          const newTx = payload.new as any;
          const prevStatus = prevStatusRef.current[newTx.id];

          // In-app notification when status changes to settlement
          if (prevStatus && prevStatus !== "settlement" && newTx.status === "settlement") {
            toast.success("Pembayaran Berhasil! 🎉", {
              description: `+${newTx.coins?.toLocaleString()} koin telah ditambahkan ke saldo kamu.`,
              duration: 8000,
            });
            // Refresh coin balance
            refreshCoins?.();
          } else if (prevStatus === "pending" && newTx.status === "deny") {
            toast.error("Pembayaran Ditolak", {
              description: "Transaksi kamu ditolak oleh payment gateway.",
              duration: 6000,
            });
          } else if (prevStatus === "pending" && newTx.status === "expire") {
            toast.warning("Pembayaran Kedaluwarsa", {
              description: "Waktu pembayaran habis. Silakan coba lagi.",
              duration: 6000,
            });
          } else if (prevStatus === "pending" && newTx.status === "cancel") {
            toast.error("Pembayaran Dibatalkan", {
              description: "Transaksi telah dibatalkan.",
              duration: 6000,
            });
          }

          // Update prev status tracking
          prevStatusRef.current[newTx.id] = newTx.status;

          setTransactions((prev) =>
            prev.map((tx) =>
              tx.id === newTx.id
                ? { ...tx, status: newTx.status, payment_type: newTx.payment_type }
                : tx
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refreshCoins]);

  const handleRetry = async (tx: Transaction) => {
    if (!user) return;
    setRetrying(tx.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-midtrans-token", {
        body: {
          package_id: tx.package_id,
          coins: tx.coins,
          amount: tx.amount,
        },
      });

      if (error || !data?.token) throw new Error(error?.message || "Gagal membuat transaksi baru");

      if (data.client_key) {
        const script = document.querySelector('script[src*="midtrans"]') as HTMLScriptElement;
        if (script) script.setAttribute("data-client-key", data.client_key);
      }

      if (window.snap) {
        window.snap.pay(data.token, {
          onSuccess: () => {
            toast.success("Pembayaran Berhasil! 🎉", {
              description: `+${tx.coins.toLocaleString()} koin telah ditambahkan.`,
            });
            refreshCoins?.();
          },
          onPending: () => {
            toast("Menunggu Pembayaran", {
              description: "Silakan selesaikan pembayaran Anda.",
            });
          },
          onError: () => {
            toast.error("Pembayaran Gagal", {
              description: "Terjadi kesalahan saat memproses pembayaran.",
            });
          },
          onClose: () => {
            // Refresh transactions list
            supabase
              .from("transactions")
              .select("*")
              .order("created_at", { ascending: false })
              .then(({ data: refreshed }) => {
                if (refreshed) setTransactions(refreshed as unknown as Transaction[]);
              });
          },
        });
      } else {
        toast.error("Payment gateway belum siap", {
          description: "Silakan refresh halaman dan coba lagi.",
        });
      }
    } catch (err: any) {
      toast.error("Gagal", { description: err.message || "Tidak dapat memproses ulang transaksi." });
    } finally {
      setRetrying(null);
    }
  };

  const totalSpent = transactions.filter((t) => t.status === "settlement").reduce((s, t) => s + t.amount, 0);
  const totalCoins = transactions.filter((t) => t.status === "settlement").reduce((s, t) => s + t.coins, 0);

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
            Riwayat Transaksi
          </h1>
          <p className="mt-2 text-muted-foreground">Semua riwayat top-up koin kamu</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Memperbarui..." : "Refresh Status"}
          </Button>
        </div>

        {/* Summary cards */}
        <div className="mx-auto mb-8 grid max-w-2xl grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 py-4">
              <Receipt className="h-8 w-8 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Total Belanja</p>
                <p className="font-display text-lg font-bold text-foreground">{formatRupiah(totalSpent)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 py-4">
              <Coins className="h-8 w-8 text-accent" />
              <div>
                <p className="text-xs text-muted-foreground">Total Koin Dibeli</p>
                <p className="font-display text-lg font-bold text-foreground">{totalCoins.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Belum ada transaksi — ayo top up koin!</p>
            <Link
              to="/topup"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground transition-all hover:brightness-110"
            >
              Top Up Sekarang
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            {transactions.map((tx, i) => {
              const cfg = statusConfig[tx.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              const date = new Date(tx.created_at);
              const showRetry = canRetry(tx.status);

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link to={`/transactions/${tx.id}`} className="block">
                  <Card className="border-border/50 transition-colors hover:border-primary/30 cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <StatusIcon className={`h-6 w-6 shrink-0 ${cfg.color}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {tx.coins.toLocaleString()} Koin
                            </p>
                            <Badge
                              variant={tx.status === "settlement" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            {" · "}
                            {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            {tx.payment_type && ` · ${tx.payment_type}`}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground/60">{tx.order_id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="font-display text-sm font-bold text-foreground">
                            {formatRupiah(tx.amount)}
                          </p>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </div>
                      {showRetry && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            disabled={retrying === tx.id}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRetry(tx); }}
                          >
                            {retrying === tx.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Bayar Ulang
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default TransactionHistory;
