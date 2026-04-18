import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";

/**
 * Subscribes globally to changes on the user's transactions and prize_claims rows.
 * Fires toast notifications wherever the user is in the app when:
 *  - a coin top-up transaction transitions to `settlement` (coins credited),
 *  - a transaction transitions to `deny` / `cancel` / `expire`,
 *  - a shipping payment (prize_claims.payment_status) transitions to `paid` or `failed`.
 *
 * Mount once at the app root inside <AuthProvider> + <GachaProvider>.
 */
export const useGlobalTransactionNotifications = () => {
  const { user } = useAuth();
  const { refreshCoins } = useGacha();
  // Track previous status per row id so we only notify on actual transitions.
  const prevTxStatus = useRef<Record<string, string>>({});
  const prevClaimPayment = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      prevTxStatus.current = {};
      prevClaimPayment.current = {};
      return;
    }

    // Seed initial state so we don't fire toasts on first hydration.
    let cancelled = false;
    (async () => {
      const [{ data: txs }, { data: claims }] = await Promise.all([
        supabase.from("transactions").select("id,status").eq("user_id", user.id),
        supabase.from("prize_claims").select("id,payment_status").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      txs?.forEach((t) => { prevTxStatus.current[t.id] = t.status; });
      claims?.forEach((c) => { prevClaimPayment.current[c.id] = c.payment_status; });
    })();

    const channel = supabase
      .channel(`global-tx-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { id: string; status: string; coins: number; order_id: string };
          const prev = prevTxStatus.current[row.id];
          prevTxStatus.current[row.id] = row.status;

          if (prev === row.status) return;

          if (row.status === "settlement" && prev !== "settlement") {
            toast.success("Pembayaran Berhasil! 🎉", {
              description: `+${row.coins?.toLocaleString()} koin telah masuk ke saldo kamu.`,
              duration: 8000,
              action: {
                label: "Lihat",
                onClick: () => { window.location.href = `/transactions/${row.id}`; },
              },
            });
            refreshCoins?.();
          } else if (row.status === "deny" && prev !== "deny") {
            toast.error("Pembayaran Ditolak", {
              description: "Transaksi top-up kamu ditolak. Koin tidak ditambahkan.",
              duration: 6000,
            });
          } else if (row.status === "expire" && prev !== "expire") {
            toast.warning("Pembayaran Kedaluwarsa", {
              description: "Waktu pembayaran top-up habis. Silakan coba lagi.",
              duration: 6000,
            });
          } else if (row.status === "cancel" && prev !== "cancel") {
            toast.error("Pembayaran Dibatalkan", {
              description: "Transaksi top-up dibatalkan. Koin tidak ditambahkan.",
              duration: 6000,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "prize_claims",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { id: string; payment_status: string; prize_name: string };
          const prev = prevClaimPayment.current[row.id];
          prevClaimPayment.current[row.id] = row.payment_status;

          if (prev === row.payment_status) return;

          if (row.payment_status === "paid" && prev !== "paid") {
            toast.success("Ongkir Lunas! 📦", {
              description: `Pembayaran ongkir untuk "${row.prize_name}" terkonfirmasi. Klaim akan segera diproses admin.`,
              duration: 8000,
            });
          } else if (row.payment_status === "failed" && prev !== "failed") {
            toast.error("Pembayaran Ongkir Gagal", {
              description: `Pembayaran ongkir untuk "${row.prize_name}" gagal/dibatalkan. Coba bayar ulang dari Riwayat Klaim.`,
              duration: 8000,
            });
          }
        },
      )
      .subscribe();

    // Polling fallback: every 20s, check Midtrans status for any pending transactions
    // (in case Midtrans webhook is not configured or fails to reach our server).
    const pollPending = async () => {
      const { data: pending } = await supabase
        .from("transactions")
        .select("order_id, status")
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (!pending || pending.length === 0) return;
      for (const tx of pending) {
        try {
          await supabase.functions.invoke("check-midtrans-status", {
            body: { order_id: tx.order_id },
          });
        } catch (e) {
          // ignore individual failures; will retry next tick
        }
      }
    };
    // First poll after 5s, then every 20s
    const firstPoll = setTimeout(pollPending, 5000);
    const pollInterval = setInterval(pollPending, 20000);

    return () => {
      cancelled = true;
      clearTimeout(firstPoll);
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [user, refreshCoins]);
};
