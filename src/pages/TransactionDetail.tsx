import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Receipt, Clock, CheckCircle, XCircle, AlertCircle,
  Coins, RefreshCw, Loader2, CreditCard, Calendar, Hash, Package,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";


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
  updated_at: string;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bgColor: string; label: string; description: string }> = {
  settlement: { icon: CheckCircle, color: "text-green-500", bgColor: "bg-green-500/10 border-green-500/30", label: "Berhasil", description: "Pembayaran telah berhasil diproses dan koin telah ditambahkan ke saldo kamu." },
  pending: { icon: Clock, color: "text-yellow-500", bgColor: "bg-yellow-500/10 border-yellow-500/30", label: "Menunggu Pembayaran", description: "Transaksi sedang menunggu pembayaran. Silakan selesaikan pembayaran sebelum waktu habis." },
  expire: { icon: AlertCircle, color: "text-muted-foreground", bgColor: "bg-muted/50 border-border", label: "Kedaluwarsa", description: "Waktu pembayaran telah habis. Kamu bisa membuat transaksi baru dengan tombol Bayar Ulang." },
  cancel: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/30", label: "Dibatalkan", description: "Transaksi ini telah dibatalkan." },
  deny: { icon: XCircle, color: "text-red-500", bgColor: "bg-red-500/10 border-red-500/30", label: "Ditolak", description: "Pembayaran ditolak oleh payment gateway. Silakan coba metode pembayaran lain." },
  refund: { icon: AlertCircle, color: "text-orange-500", bgColor: "bg-orange-500/10 border-orange-500/30", label: "Refund", description: "Dana telah dikembalikan ke metode pembayaran asal." },
};

const paymentTypeLabel: Record<string, string> = {
  bank_transfer: "Transfer Bank",
  credit_card: "Kartu Kredit",
  echannel: "Mandiri Bill",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  qris: "QRIS",
  cstore: "Minimarket",
  bca_va: "BCA Virtual Account",
  bni_va: "BNI Virtual Account",
  bri_va: "BRI Virtual Account",
  permata_va: "Permata Virtual Account",
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const canRetry = (status: string) => ["expire", "cancel", "deny"].includes(status);

const timelineSteps = (tx: Transaction) => {
  const steps: { label: string; time: string | null; status: "done" | "active" | "upcoming" | "failed" }[] = [];
  const created = tx.created_at;

  steps.push({ label: "Transaksi Dibuat", time: created, status: "done" });

  if (tx.status === "pending") {
    steps.push({ label: "Menunggu Pembayaran", time: null, status: "active" });
    steps.push({ label: "Pembayaran Selesai", time: null, status: "upcoming" });
    steps.push({ label: "Koin Ditambahkan", time: null, status: "upcoming" });
  } else if (tx.status === "settlement") {
    steps.push({ label: "Pembayaran Diterima", time: tx.updated_at, status: "done" });
    steps.push({ label: "Koin Ditambahkan", time: tx.updated_at, status: "done" });
  } else if (tx.status === "expire") {
    steps.push({ label: "Menunggu Pembayaran", time: null, status: "done" });
    steps.push({ label: "Waktu Habis", time: tx.updated_at, status: "failed" });
  } else if (tx.status === "cancel") {
    steps.push({ label: "Dibatalkan", time: tx.updated_at, status: "failed" });
  } else if (tx.status === "deny") {
    steps.push({ label: "Pembayaran Ditolak", time: tx.updated_at, status: "failed" });
  } else if (tx.status === "refund") {
    steps.push({ label: "Pembayaran Diterima", time: null, status: "done" });
    steps.push({ label: "Dana Dikembalikan", time: tx.updated_at, status: "done" });
  }

  return steps;
};

const TransactionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { refreshCoins } = useGacha();
  const navigate = useNavigate();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const fetchTx = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", id)
        .single();
      if (data) setTx(data as unknown as Transaction);
      setLoading(false);
    };
    fetchTx();

    const channel = supabase
      .channel(`tx-detail-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `id=eq.${id}` },
        (payload) => {
          const newTx = payload.new as any;
          setTx((prev) => prev ? { ...prev, ...newTx } : prev);
          if (newTx.status === "settlement") {
            toast.success("Pembayaran Berhasil! 🎉", {
              description: `+${newTx.coins?.toLocaleString()} koin ditambahkan.`,
              duration: 8000,
            });
            refreshCoins?.();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, id, refreshCoins]);

  const handleRetry = async () => {
    if (!user || !tx) return;
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-violet-checkout", {
        body: { package_id: tx.package_id, return_url: `${window.location.origin}/transactions` },
      });
      if (error || !data?.redirect_url) throw new Error(error?.message || "Gagal membuat transaksi baru");
      toast.info("Mengarahkan ke halaman pembayaran...");
      window.location.href = data.redirect_url;
    } catch (err: any) {
      toast.error("Gagal", { description: err.message });
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
          <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-muted-foreground">Transaksi tidak ditemukan</p>
          <Link to="/transactions" className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        </main>
      </div>
    );
  }

  const cfg = statusConfig[tx.status] || statusConfig.pending;
  const StatusIcon = cfg.icon;
  const steps = timelineSteps(tx);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Link
          to="/transactions"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Riwayat
        </Link>

        <div className="mx-auto max-w-lg space-y-4">
          {/* Status Banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className={`border ${cfg.bgColor}`}>
              <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
                <StatusIcon className={`h-12 w-12 ${cfg.color}`} />
                <div>
                  <h1 className="font-display text-xl font-bold text-foreground">{cfg.label}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{cfg.description}</p>
                </div>
                <p className="font-display text-3xl font-bold text-foreground">{formatRupiah(tx.amount)}</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Detail Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">Detail Transaksi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="h-4 w-4" /> Order ID
                  </div>
                  <p className="max-w-[200px] truncate text-sm font-medium text-foreground">{tx.order_id}</p>
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Coins className="h-4 w-4" /> Jumlah Koin
                  </div>
                  <p className="text-sm font-semibold text-accent">{tx.coins.toLocaleString()} Koin</p>
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" /> Metode Pembayaran
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {tx.payment_type ? (paymentTypeLabel[tx.payment_type] || tx.payment_type) : "—"}
                  </p>
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Tanggal
                  </div>
                  <p className="text-sm font-medium text-foreground">{formatDate(tx.created_at)}</p>
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" /> Waktu
                  </div>
                  <p className="text-sm font-medium text-foreground">{formatTime(tx.created_at)}</p>
                </div>
                <Separator className="bg-border/50" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" /> Status
                  </div>
                  <Badge variant={tx.status === "settlement" ? "default" : "secondary"}>{cfg.label}</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Timeline */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-foreground">Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  {steps.map((step, i) => {
                    const isLast = i === steps.length - 1;
                    let dotColor = "bg-muted-foreground/30";
                    if (step.status === "done") dotColor = "bg-green-500";
                    else if (step.status === "active") dotColor = "bg-yellow-500 animate-pulse";
                    else if (step.status === "failed") dotColor = "bg-red-500";

                    let lineColor = "bg-border/50";
                    if (step.status === "done") lineColor = "bg-green-500/30";

                    return (
                      <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                        {/* Line */}
                        {!isLast && (
                          <div className={`absolute left-[7px] top-5 h-full w-0.5 ${lineColor}`} />
                        )}
                        {/* Dot */}
                        <div className={`relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-background ${dotColor}`} />
                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${step.status === "upcoming" ? "text-muted-foreground/50" : "text-foreground"}`}>
                            {step.label}
                          </p>
                          {step.time && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDate(step.time)} · {formatTime(step.time)}
                            </p>
                          )}
                          {step.status === "active" && (
                            <p className="mt-0.5 text-xs text-yellow-500">Menunggu...</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Retry Button */}
          {canRetry(tx.status) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Button
                className="w-full gap-2"
                variant="outline"
                size="lg"
                disabled={retrying}
                onClick={handleRetry}
              >
                {retrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Bayar Ulang
              </Button>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TransactionDetail;
