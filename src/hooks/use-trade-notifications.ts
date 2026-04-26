import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";

/**
 * Subscribes globally to changes on `trades` rows where the current user is
 * either the initiator or the responder. Pushes inbox notifications + toasts
 * when:
 *  - Someone accepts the user's outgoing trade link (initiator side).
 *  - The user is set as a responder on a new trade (rare — link-based flow).
 *  - A trade transitions to accepted / rejected / cancelled / expired.
 *
 * Mount once at the app root inside <AuthProvider> + <NotificationsProvider>.
 */
export const useTradeNotifications = () => {
  const { user } = useAuth();
  const { push } = useNotifications();
  const prevStatus = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      prevStatus.current = {};
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("trades")
        .select("id,status,initiator_id,responder_id")
        .or(`initiator_id.eq.${user.id},responder_id.eq.${user.id}`);
      if (cancelled) return;
      data?.forEach((t) => {
        prevStatus.current[t.id] = t.status;
      });
    })();

    const handleRow = (
      row: {
        id: string;
        token: string;
        status: string;
        initiator_id: string;
        responder_id: string | null;
        tier_label: string;
      },
      isInsert: boolean,
    ) => {
      const prev = prevStatus.current[row.id];
      prevStatus.current[row.id] = row.status;
      const isInitiator = row.initiator_id === user.id;
      const isResponder = row.responder_id === user.id;

      // New incoming trade request (responder explicitly assigned).
      if (isInsert && isResponder && row.status === "pending") {
        toast.info("Trade Request Masuk", {
          description: `Tier ${row.tier_label} — buka untuk merespons.`,
          duration: 8000,
        });
        push({
          kind: "info",
          title: "Trade request masuk",
          description: `Permintaan trade Tier ${row.tier_label}.`,
          href: `/trade/req/${row.token}`,
          dedupKey: `trade-incoming:${row.id}`,
        });
        return;
      }

      if (prev === row.status) return;

      // Initiator gets pinged when someone claims their open link.
      if (
        isInitiator &&
        !isInsert &&
        row.responder_id &&
        row.status === "pending"
      ) {
        push({
          kind: "info",
          title: "Partner trade ditemukan",
          description: `Seseorang mengklaim trade link Tier ${row.tier_label}.`,
          href: `/trade/req/${row.token}`,
          dedupKey: `trade-claimed:${row.id}`,
        });
      }

      if (row.status === "accepted") {
        toast.success("Trade Berhasil ✓", {
          description: `Pertukaran Tier ${row.tier_label} selesai.`,
          duration: 8000,
        });
        push({
          kind: "success",
          title: "Trade selesai",
          description: `Pertukaran Tier ${row.tier_label} berhasil dieksekusi.`,
          href: `/inventory`,
          dedupKey: `trade-accepted:${row.id}`,
        });
      } else if (row.status === "rejected") {
        push({
          kind: "warning",
          title: "Trade ditolak",
          description: `Permintaan trade Tier ${row.tier_label} ditolak.`,
          dedupKey: `trade-rejected:${row.id}`,
        });
      } else if (row.status === "cancelled") {
        push({
          kind: "warning",
          title: "Trade dibatalkan",
          description: `Trade Tier ${row.tier_label} dibatalkan.`,
          dedupKey: `trade-cancelled:${row.id}`,
        });
      } else if (row.status === "expired") {
        push({
          kind: "warning",
          title: "Trade kedaluwarsa",
          description: `Trade Tier ${row.tier_label} sudah lewat 24 jam.`,
          dedupKey: `trade-expired:${row.id}`,
        });
      }
    };

    const channel = supabase
      .channel(`global-trades-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades", filter: `responder_id=eq.${user.id}` },
        (payload) => handleRow(payload.new as never, true),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `initiator_id=eq.${user.id}` },
        (payload) => handleRow(payload.new as never, false),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `responder_id=eq.${user.id}` },
        (payload) => handleRow(payload.new as never, false),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, push]);
};
