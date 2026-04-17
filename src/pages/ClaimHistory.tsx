import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, Clock, Truck, CheckCircle, AlertCircle, MapPin, Phone, User, ExternalLink, Copy, RefreshCw, MapPinned } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";


const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  processing: { icon: Package, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
  shipped: { icon: Truck, color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/30" },
  delivered: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10 border-green-400/30" },
};

interface Claim {
  id: string;
  prize_name: string;
  tier_label: string;
  campaign_id: string;
  image_url: string;
  status: string;
  recipient_name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  shipping_method: string;
  shipping_cost: number;
  shipping_paid: boolean;
  tracking_number: string | null;
  courier_name: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const ClaimHistory = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);


  useEffect(() => {
    if (!user) return;
    const fetchClaims = async () => {
      const { data } = await supabase
        .from("prize_claims")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setClaims((data as Claim[]) || []);
      setLoading(false);
    };
    fetchClaims();

    // Realtime subscription for live tracking updates
    const channel = supabase
      .channel("my-claims")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "prize_claims",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Claim;
          setClaims(prev => prev.map(c => c.id === updated.id ? updated : c));

          // Show notification for status changes
          if (updated.status === "shipped" && updated.tracking_number) {
            toast.success("📦 Paket dikirim!", {
              description: `${updated.prize_name} dikirim via ${updated.courier_name || "kurir"} - ${updated.tracking_number}`,
            });
          } else if (updated.status === "delivered") {
            toast.success("✅ Paket sampai!", {
              description: `${updated.prize_name} telah diterima.`,
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const statuses = ["all", "pending", "processing", "shipped", "delivered"];
  const filtered = filter === "all" ? claims : claims.filter((c) => c.status === filter);

  const copyTracking = (num: string) => {
    navigator.clipboard.writeText(num);
    toast.success("Nomor resi disalin!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold mb-1">{t("claimHistory")}</h1>
          <p className="text-muted-foreground mb-6">{t("claimHistoryDesc")}</p>

          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-all border ${
                  filter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {s === "all" ? t("all") : s}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20 text-muted-foreground">{t("processing")}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">{t("noClaimsYet")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((claim, i) => {
                const cfg = statusConfig[claim.status] || statusConfig.pending;
                const Icon = cfg.icon;
                const isExpanded = expanded === claim.id;

                return (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    <button
                      onClick={() => setExpanded(isExpanded ? null : claim.id)}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/30 transition-colors"
                    >
                      {claim.image_url ? (
                        <img src={claim.image_url} alt="" className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{claim.prize_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {claim.tier_label} · {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        <span className="capitalize">{claim.status}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="border-t border-border px-4 pb-4 pt-3 space-y-3"
                      >
                        {/* Status timeline */}
                        <div className="flex items-center gap-1">
                          {["pending", "processing", "shipped", "delivered"].map((s, idx) => {
                            const stepIdx = ["pending", "processing", "shipped", "delivered"].indexOf(claim.status);
                            const active = idx <= stepIdx;
                            const sCfg = statusConfig[s];
                            const SIcon = sCfg.icon;
                            return (
                              <div key={s} className="flex items-center gap-1 flex-1">
                                <div className={`flex items-center justify-center h-7 w-7 rounded-full border ${active ? sCfg.bg + " " + sCfg.color : "bg-secondary/50 text-muted-foreground/40 border-border"}`}>
                                  <SIcon className="h-3.5 w-3.5" />
                                </div>
                                {idx < 3 && (
                                  <div className={`flex-1 h-0.5 rounded ${active && idx < stepIdx ? "bg-primary" : "bg-border"}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Tracking Info */}
                        {claim.tracking_number && (
                          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                            <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                              <Truck className="h-3.5 w-3.5" /> Informasi Pengiriman
                            </p>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Kurir</p>
                                <p className="text-sm font-semibold">{claim.courier_name || "-"}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">No. Resi</p>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-mono font-semibold">{claim.tracking_number}</p>
                                  <button onClick={() => copyTracking(claim.tracking_number!)} className="text-muted-foreground hover:text-foreground">
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            {claim.shipped_at && (
                              <p className="text-xs text-muted-foreground">
                                Dikirim: {format(new Date(claim.shipped_at), "dd MMM yyyy, HH:mm")}
                              </p>
                            )}
                            {claim.delivered_at && (
                              <p className="text-xs text-green-400">
                                Diterima: {format(new Date(claim.delivered_at), "dd MMM yyyy, HH:mm")}
                              </p>
                            )}
                            {claim.tracking_url && (
                              <a
                                href={claim.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                              >
                                <ExternalLink className="h-3 w-3" /> Lacak Paket
                              </a>
                            )}
                          </div>
                        )}

                        {/* Shipping cost */}
                        {claim.shipping_cost > 0 && (
                          <div className="flex items-center justify-between text-sm rounded-lg border border-border p-2.5">
                            <span className="text-muted-foreground">Ongkos Kirim</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">Rp {claim.shipping_cost.toLocaleString()}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                claim.shipping_paid
                                  ? "bg-green-400/10 text-green-400 border border-green-400/30"
                                  : "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30"
                              }`}>
                                {claim.shipping_paid ? "Lunas" : "Belum Bayar"}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-muted-foreground text-xs">{t("recipientName")}</p>
                              <p className="font-medium">{claim.recipient_name}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-muted-foreground text-xs">{t("phoneNumber")}</p>
                              <p className="font-medium">{claim.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 sm:col-span-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-muted-foreground text-xs">{t("fullAddress")}</p>
                              <p className="font-medium">{claim.address}, {claim.city}, {claim.province} {claim.postal_code}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-muted-foreground text-xs">{t("shippingMethod")}</p>
                              <p className="font-medium capitalize">{claim.shipping_method}</p>
                            </div>
                          </div>
                        </div>
                        {claim.notes && (
                          <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">{claim.notes}</p>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ClaimHistory;
