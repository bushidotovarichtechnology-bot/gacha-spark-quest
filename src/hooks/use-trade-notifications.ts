import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { logTradeNotif, type TradeNotifKind, type TradeNotifSource } from "@/lib/tradeNotificationLog";

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

    const fireOnce = (key: string, kind: TradeNotifKind, ctx: {
      tradeId: string; tier: string; source: TradeNotifSource;
      prevStatus: string | null; nextStatus: string;
    }, fn: () => void) => {
      if (firedKeys.current.has(key)) {
        logTradeNotif({
          tradeId: ctx.tradeId, tier: ctx.tier, kind: "deduped", source: ctx.source,
          dedupKey: key, prevStatus: ctx.prevStatus, nextStatus: ctx.nextStatus,
          fired: false, note: `dedup hit for kind=${kind}`,
        });
        return;
      }
      firedKeys.current.add(key);
      fn();
      logTradeNotif({
        tradeId: ctx.tradeId, tier: ctx.tier, kind, source: ctx.source,
        dedupKey: key, prevStatus: ctx.prevStatus, nextStatus: ctx.nextStatus,
        fired: true,
      });
    };

    const handleRow = (row: TradeRow, isInsert: boolean, source: TradeNotifSource) => {
      const prev = prevStatus.current[row.id] ?? null;
      const prevResp = prevResponder.current[row.id];
      prevStatus.current[row.id] = row.status;
      prevResponder.current[row.id] = row.responder_id;

      const isInitiator = row.initiator_id === user.id;
      const isResponder = row.responder_id === user.id;
      const ctxBase = { tradeId: row.id, tier: row.tier_label, source, prevStatus: prev, nextStatus: row.status };

      // Skip emitting on the very first sync (we're just hydrating state).
      if (!initialized.current && !isInsert) {
        logTradeNotif({
          ...ctxBase, kind: "skipped-init", dedupKey: null, fired: false,
          note: "hydration tick — no toast emitted",
        });
        return;
      }

      // New incoming trade request (responder explicitly assigned).
      if (isInsert && isResponder && row.status === "pending") {
        const key = `trade-incoming:${row.id}`;
        fireOnce(key, "incoming", ctxBase, () => {
          toast.info("Trade Request Masuk", {
            description: `Tier ${row.tier_label} — buka untuk merespons.`,
            duration: 8000,
          });
          push({
            kind: "info",
            title: "Trade request masuk",
            description: `Permintaan trade Tier ${row.tier_label}.`,
            href: `/trade/req/${row.token}`,
            dedupKey: key,
          });
        });
        return;
      }

      const statusChanged = prev !== null && prev !== row.status;
      const responderClaimed = prevResp === null && row.responder_id !== null;

      // Initiator gets pinged when someone claims their open link.
      if (isInitiator && responderClaimed && row.status === "pending") {
        const key = `trade-claimed:${row.id}`;
        fireOnce(key, "claimed", ctxBase, () => {
          push({
            kind: "info",
            title: "Partner trade ditemukan",
            description: `Seseorang mengklaim trade link Tier ${row.tier_label}.`,
            href: `/trade/req/${row.token}`,
            dedupKey: key,
          });
        });
      }

      if (!statusChanged) {
        logTradeNotif({
          ...ctxBase, kind: "skipped-no-change", dedupKey: null, fired: false,
          note: `prev=${prev ?? "null"} → next=${row.status}`,
        });
        return;
      }

      if (row.status === "accepted") {
        const key = `trade-accepted:${row.id}`;
        fireOnce(key, "accepted", ctxBase, () => {
          toast.success("Trade Berhasil ✓", {
            description: `Pertukaran Tier ${row.tier_label} selesai.`,
            duration: 8000,
          });
          push({
            kind: "success",
            title: "Trade selesai",
            description: `Pertukaran Tier ${row.tier_label} berhasil dieksekusi.`,
            href: `/inventory`,
            dedupKey: key,
          });
        });
      } else if (row.status === "rejected") {
        const key = `trade-rejected:${row.id}`;
        fireOnce(key, "rejected", ctxBase, () =>
          push({
            kind: "warning",
            title: "Trade ditolak",
            description: `Permintaan trade Tier ${row.tier_label} ditolak.`,
            dedupKey: key,
          }),
        );
      } else if (row.status === "cancelled") {
        const key = `trade-cancelled:${row.id}`;
        fireOnce(key, "cancelled", ctxBase, () =>
          push({
            kind: "warning",
            title: "Trade dibatalkan",
            description: `Trade Tier ${row.tier_label} dibatalkan.`,
            dedupKey: key,
          }),
        );
      } else if (row.status === "expired") {
        const key = `trade-expired:${row.id}`;
        fireOnce(key, "expired", ctxBase, () =>
          push({
            kind: "warning",
            title: "Trade kedaluwarsa",
            description: `Trade Tier ${row.tier_label} sudah lewat 24 jam.`,
            dedupKey: key,
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
    const reconcile = async (source: TradeNotifSource = "reconcile-poll") => {
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
        if (known !== row.status) handleRow(row as TradeRow, false, source);
        else prevResponder.current[row.id] = row.responder_id;
      });

      if (!initialized.current) initialized.current = true;
    };

    reconcile("reconcile-init");

    const channel = supabase
      .channel(`global-trades-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trades", filter: `responder_id=eq.${user.id}` },
        (payload) => handleRow(payload.new as TradeRow, true, "realtime-insert"),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `initiator_id=eq.${user.id}` },
        (payload) => handleRow(payload.new as TradeRow, false, "realtime-update"),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `responder_id=eq.${user.id}` },
        (payload) => handleRow(payload.new as TradeRow, false, "realtime-update"),
      )
      .subscribe();

    // Fallback: periodic reconcile + on tab focus / network reconnect.
    const interval = window.setInterval(() => reconcile("reconcile-poll"), POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") reconcile("reconcile-visibility"); };
    const onOnline = () => reconcile("reconcile-online");
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
