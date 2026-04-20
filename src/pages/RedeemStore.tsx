import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Ticket, Gift, ShoppingBag, History, Coins, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";
import { toast } from "sonner";
import { supabaseImg } from "@/lib/imageTransform";

const RedeemStore = () => {
  const { user } = useAuth();
  const { refreshInventory } = useGacha();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"store" | "history">("store");

  const { data: ticketBalance = 0 } = useQuery({
    queryKey: ["ticket-balance", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data } = await supabase.rpc("get_user_ticket_balance", { _user_id: user.id });
      if (!data || (data as any[]).length === 0) return 0;
      return (data as any[]).reduce((sum: number, r: any) => sum + Number(r.total_remaining), 0);
    },
    enabled: !!user,
  });

  const { data: rewards = [] } = useQuery({
    queryKey: ["redeem-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("redeem_rewards").select("*").eq("is_active", true).order("sort_order", { ascending: true }).order("ticket_cost", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: claims = [] } = useQuery({
    queryKey: ["redeem-claims", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("redeem_claims").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const redeemMutation = useMutation({
    mutationFn: async (reward: any) => {
      if (!user) throw new Error("Belum login");
      const { data, error } = await supabase.functions.invoke("redeem-reward", {
        body: { reward_id: reward.id },
      });
      if (error) {
        // Try to extract structured error from edge function response
        const ctx: any = (error as any).context;
        let code: string | undefined;
        try {
          const txt = await ctx?.text?.();
          if (txt) code = JSON.parse(txt)?.error;
        } catch { /* ignore */ }
        const map: Record<string, string> = {
          out_of_stock: "Stok hadiah habis",
          insufficient_tickets: "Tiket tidak cukup",
          reward_inactive: "Hadiah tidak aktif",
          reward_not_found: "Hadiah tidak ditemukan",
          unauthorized: "Sesi berakhir, silakan login ulang",
        };
        throw new Error(map[code ?? ""] ?? error.message ?? "Gagal menukar hadiah");
      }
      if ((data as any)?.error) {
        const map: Record<string, string> = {
          out_of_stock: "Stok hadiah habis",
          insufficient_tickets: "Tiket tidak cukup",
          reward_inactive: "Hadiah tidak aktif",
          reward_not_found: "Hadiah tidak ditemukan",
        };
        throw new Error(map[(data as any).error] ?? (data as any).error);
      }
      return data;
    },
    onSuccess: async () => {
      toast.success("🎉 Hadiah berhasil ditukar! Cek inventory kamu.");
      await refreshInventory();
      queryClient.invalidateQueries({ queryKey: ["ticket-balance"] });
      queryClient.invalidateQueries({ queryKey: ["redeem-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["redeem-claims"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    processing: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="min-h-screen pb-20">
      <Navbar />
      <div className="container mx-auto px-4 pt-24">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Bushido Tiket Store</h1>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Apa itu Bushido Tiket?"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                  <p className="mb-1 font-semibold text-foreground">Tiket vs Koin</p>
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-primary">Bushido Tiket</span> didapat dari setiap tarikan gacha, hanya bisa ditukar di store ini.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-semibold text-accent">Bushido Koin</span> adalah mata uang utama untuk membeli tarikan gacha.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-4 py-2">
            <Ticket className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-primary">{ticketBalance}</span>
            <span className="text-sm text-muted-foreground">Bushido Tiket</span>
          </div>
        </div>

        {/* Penjelasan singkat Tiket vs Koin */}
        <div className="mb-6 rounded-xl border border-border/60 bg-secondary/30 p-3">
          <div className="flex items-start gap-3 text-xs sm:text-sm">
            <div className="flex flex-1 items-start gap-2">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                <span className="font-semibold text-primary">Bushido Tiket</span> — diperoleh otomatis dari setiap tarikan gacha. Tukar di sini untuk hadiah eksklusif.
              </p>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="flex flex-1 items-start gap-2">
              <Coins className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <p className="text-muted-foreground">
                <span className="font-semibold text-accent">Bushido Koin</span> — mata uang utama untuk melakukan tarikan gacha di setiap campaign.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <Button variant={tab === "store" ? "default" : "outline"} size="sm" onClick={() => setTab("store")} className="gap-2">
            <ShoppingBag className="h-4 w-4" /> Tukar Hadiah
          </Button>
          <Button variant={tab === "history" ? "default" : "outline"} size="sm" onClick={() => setTab("history")} className="gap-2">
            <History className="h-4 w-4" /> Riwayat
          </Button>
        </div>

        {tab === "store" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.length === 0 && (
              <p className="col-span-full text-center text-sm text-muted-foreground py-12">Belum ada hadiah tersedia.</p>
            )}
            {rewards.map((reward, i) => (
              <motion.div
                key={reward.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                {reward.image_url && (
                  <img src={supabaseImg(reward.image_url, 500)} alt={reward.name} loading="lazy" decoding="async" className="mb-3 h-40 w-full rounded-lg object-contain bg-secondary/40 p-3" />
                )}
                <h3 className="font-display text-base font-bold text-foreground">{reward.name}</h3>
                <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{reward.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Ticket className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold text-primary">{reward.ticket_cost}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Stok: {reward.stock}</span>
                    <Button
                      size="sm"
                      disabled={ticketBalance < reward.ticket_cost || reward.stock <= 0 || redeemMutation.isPending}
                      onClick={() => redeemMutation.mutate(reward)}
                    >
                      <Gift className="mr-1.5 h-3.5 w-3.5" />
                      Tukar
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {claims.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">Belum ada riwayat penukaran.</p>
            )}
            {claims.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{claim.reward_name}</h3>
                  <p className="text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleDateString("id-ID")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Ticket className="h-3 w-3" /> -{claim.tickets_spent}
                  </span>
                  <Badge className={statusColors[claim.status] || statusColors.pending}>{claim.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RedeemStore;
