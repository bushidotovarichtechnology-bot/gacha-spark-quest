import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Ticket, Gift, ShoppingBag, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";
import { toast } from "sonner";

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
      const { data, error } = await supabase.from("redeem_rewards").select("*").eq("is_active", true).order("ticket_cost", { ascending: true });
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
      if (!user) throw new Error("Not authenticated");
      if (ticketBalance < reward.ticket_cost) throw new Error("Tiket tidak cukup");

      // Deduct tickets from oldest first
      let toDeduct = reward.ticket_cost;
      const { data: tickets } = await supabase
        .from("redeem_tickets")
        .select("*")
        .eq("user_id", user.id)
        .gt("remaining", 0)
        .order("created_at", { ascending: true });

      if (!tickets) throw new Error("Gagal mengambil data tiket");

      for (const ticket of tickets) {
        if (toDeduct <= 0) break;
        const deduct = Math.min(toDeduct, ticket.remaining);
        await supabase.from("redeem_tickets").update({ remaining: ticket.remaining - deduct }).eq("id", ticket.id);
        toDeduct -= deduct;
      }

      // Decrease stock
      await supabase.from("redeem_rewards").update({ stock: reward.stock - 1 }).eq("id", reward.id);

      // Create claim
      await supabase.from("redeem_claims").insert({
        user_id: user.id,
        reward_id: reward.id,
        reward_name: reward.name,
        tickets_spent: reward.ticket_cost,
      });

      // Add to user inventory
      await supabase.from("user_inventory").insert({
        user_id: user.id,
        prize_name: reward.name,
        tier_label: "A",
        campaign_id: "redeem-store",
        campaign_name: "Bushido Tiket Store",
        image_url: reward.image_url || "",
        coin_value: 0,
        won_at: new Date().toISOString(),
      });
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
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Bushido Tiket Store</h1>
          <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/30 px-4 py-2">
            <Ticket className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold text-primary">{ticketBalance}</span>
            <span className="text-sm text-muted-foreground">Bushido Tiket</span>
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
                  <img src={reward.image_url} alt={reward.name} className="mb-3 h-40 w-full rounded-lg object-cover" />
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
