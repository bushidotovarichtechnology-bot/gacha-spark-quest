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
 * Robustness:
 *  - Per-session in-memory dedup (`firedKeys`) prevents duplicate emissions
 *    when realtime delivers the same row twice (reconnect replay) before the
 *    localStorage-backed `dedupKey` in NotificationsContext has flushed.
 *  - Periodic + visibility-driven fallback polling re-syncs trade statuses so
 *    transitions missed during offline/reconnect windows still surface.
 */

type TradeRow = {
  id: string;
  token: string;
  status: string;
  initiator_id: string;
  responder_id: string | null;
  tier_label: string;
};

const POLL_INTERVAL_MS = 60_000; // gentle background re-sync

export const useTradeNotifications = () => {
  const { user } = useAuth();
  const { push } = useNotifications();
  const prevStatus = useRef<Record<string, string>>({});
  const prevResponder = useRef<Record<string, string | null>>({});
  const firedKeys = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!user) {
      prevStatus.current = {};
      prevResponder.current = {};
      firedKeys.current = new Set();
      initialized.current = false;
      return;
    }

    let cancelled = false;

    const fireOnce = (key: string, fn: () => void) => {
      if (firedKeys.current.has(key)) return;
      firedKeys.current.add(key);
      fn();
    };

    const handleRow = (row: TradeRow, isInsert: boolean) => {
      const prev = prevStatus.current[row.id];
      const prevResp = prevResponder.current[row.id];
      prevStatus.current[row.id] = row.status;
      prevResponder.current[row.id] = row.responder_id;

      const isInitiator = row.initiator_id === user.id;
      const isResponder = row.responder_id === user.id;

      // Skip emitting on the very first sync (we're just hydrating state).
      if (!initialized.current && !isInsert) return;

      // New incoming trade request (responder explicitly assigned).
      if (isInsert && isResponder && row.status === "pending") {
        fireOnce(`trade-incoming:${row.id}`, () => {
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
        });
        return;
      }

      const statusChanged = prev !== undefined && prev !== row.status;
      const responderClaimed = prevResp === null && row.responder_id !== null;

      // Initiator gets pinged when someone claims their open link.
      if (isInitiator && responderClaimed && row.status === "pending") {
        fireOnce(`trade-claimed:${row.id}`, () => {
          push({
            kind: "info",
            title: "Partner trade ditemukan",
            description: `Seseorang mengklaim trade link Tier ${row.tier_label}.`,
            href: `/trade/req/${row.token}`,
            dedupKey: `trade-claimed:${row.id}`,
          });
        });
      }

      if (!statusChanged) return;

      if (row.status === "accepted") {
        fireOnce(`trade-accepted:${row.id}`, () => {
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
        });
      } else if (row.status === "rejected") {
        fireOnce(`trade-rejected:${row.id}`, () =>
          push({
            kind: "warning",
            title: "Trade ditolak",
            description: `Permintaan trade Tier ${row.tier_label} ditolak.`,
            dedupKey: `trade-rejected:${row.id}`,
          }),
        );
      } else if (row.status === "cancelled") {
        fireOnce(`trade-cancelled:${row.id}`, () =>
          push({
            kind: "warning",
            title: "Trade dibatalkan",
            description: `Trade Tier ${row.tier_label} dibatalkan.`,
            dedupKey: `trade-cancelled:${row.id}`,
          }),
        );
      } else if (row.status === "expired") {
        fireOnce(`trade-expired:${row.id}`, () =>
          push({
            kind: "warning",
            title: "Trade kedaluwarsa",
            description: `Trade Tier ${row.tier_label} sudah lewat 24 jam.`,
            dedupKey: `trade-expired:${row.id}`,
          }),
        );
      }
    };

    /**
     * Pull the user's recent trades and reconcile against `prevStatus`.
     * - On the first run we only hydrate baseline state (no toasts).
     * - Subsequent runs surface any transitions the realtime channel missed
     *   (e.g. during reconnects, throttling, or background tabs).
     */
    const reconcile = async () => {
      const { data, error } = await supabase
        .from("trades")
        .select("id,token,status,initiator_id,responder_id,tier_label")
        .or(`initiator_id.eq.${user.id},responder_id.eq.${user.id}`)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (cancelled || error || !data) return;

      data.forEach((row) => {
        const known = prevStatus.current[row.id];
        if (!initialized.current) {
          prevStatus.current[row.id] = row.status;
          prevResponder.current[row.id] = row.responder_id;
          return;
        }
        if (known !== row.status) handleRow(row as TradeRow, false);
        else prevResponder.current[row.id] = row.responder_id;
      });

      if (!initialized.current) initialized.current = true;
    };

    reconcile();

    const channel = supabase
      .channel(`global-trades-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades", filter: `responder_id=eq.${user.id}` },
        (payload) => handleRow(payload.new as TradeRow, true),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `initiator_id=eq.${user.id}` },
        (payload) => handleRow(payload.new as TradeRow, false),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `responder_id=eq.${user.id}` },
        (payload) => handleRow(payload.new as TradeRow, false),
      )
      .subscribe();

    // Fallback: periodic reconcile + on tab focus / network reconnect.
    const interval = window.setInterval(reconcile, POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") reconcile(); };
    const onOnline = () => reconcile();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      supabase.removeChannel(channel);
    };
  }, [user, push]);
};
