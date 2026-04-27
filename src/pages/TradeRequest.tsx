import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2, ArrowLeftRight, AlertTriangle, ShieldCheck, Clock,
  CheckCircle2, XCircle, Ban, Hourglass, CircleDot, Timer, User, Package,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";
import { supabase } from "@/integrations/supabase/client";
import InventoryItemPicker from "@/components/trade/InventoryItemPicker";
import SecurityPinDialog from "@/components/trade/SecurityPinDialog";
import { fetchTradeByToken, hasSecurityPin, cancelTrade, rejectTrade, TRADE_GAS_FEE, TradeFetchError, type TradeFetchReason, type TradeRow } from "@/lib/tradeApi";
import { supabaseImg } from "@/lib/imageTransform";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const tierBadgeClass = (label: string) => {
  const t = label?.trim().toUpperCase();
  if (t === "S") return "bg-[hsl(var(--tier-s))] text-[hsl(var(--tier-s-foreground))] border-[hsl(var(--tier-s))]";
  if (t === "A") return "bg-[hsl(var(--tier-a))] text-[hsl(var(--tier-a-foreground))] border-[hsl(var(--tier-a))]";
  if (t === "B") return "bg-[hsl(var(--tier-b))] text-[hsl(var(--tier-b-foreground))] border-[hsl(var(--tier-b))]";
  if (t === "C") return "bg-[hsl(var(--tier-c))] text-[hsl(var(--tier-c-foreground))] border-[hsl(var(--tier-c))]";
  return "bg-secondary text-secondary-foreground border-border";
};

const TradeRequest = () => {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, refreshInventory, refreshCoins } = useGacha();

  const [trade, setTrade] = useState<TradeRow | null>(null);
  const [loadError, setLoadError] = useState<TradeFetchReason | null>(null);
  const [loading, setLoading] = useState(true);
  const [responderItems, setResponderItems] = useState<Set<string>>(new Set());
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pinReady, setPinReady] = useState<boolean | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [initiatorItemMeta, setInitiatorItemMeta] = useState<Array<{ id: string; prize: string; image: string; coin_value: number }>>([]);
  const [responderItemMetaRemote, setResponderItemMetaRemote] = useState<Array<{ id: string; prize: string; image: string; coin_value: number }>>([]);
  const [selectedEventIdx, setSelectedEventIdx] = useState<number | null>(null);
  const [itemDetail, setItemDetail] = useState<
    | { id: string; prize: string; image: string; coin_value: number; side: "initiator" | "responder" }
    | null
  >(null);
  // True briefly when realtime/local action is transitioning the trade
  // status — drives a small skeleton on the status card + button spinners
  // so the UI clearly shows "update is in flight".
  const [statusUpdating, setStatusUpdating] = useState(false);
  const statusUpdateTimerRef = useRef<number | null>(null);
  const markStatusUpdating = (ms = 1200) => {
    setStatusUpdating(true);
    if (statusUpdateTimerRef.current) window.clearTimeout(statusUpdateTimerRef.current);
    statusUpdateTimerRef.current = window.setTimeout(() => setStatusUpdating(false), ms);
  };
  useEffect(() => () => {
    if (statusUpdateTimerRef.current) window.clearTimeout(statusUpdateTimerRef.current);
  }, []);

  const pinPanelRef = useRef<HTMLDivElement | null>(null);

  const isInitiator = !!user && trade?.initiator_id === user.id;
  const isResponder = !!user && trade?.responder_id === user.id;

  // Load trade by token. Wait until auth has hydrated so we don't
  // momentarily render the "no access" card while the session is restoring.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const t = await fetchTradeByToken(token);
        if (!cancelled) setTrade(t);
      } catch (err) {
        if (cancelled) return;
        setTrade(null);
        const reason: TradeFetchReason =
          err instanceof TradeFetchError ? err.reason : "network_error";
        setLoadError(reason);
        const toastMap: Record<TradeFetchReason, { title: string; description: string }> = {
          invalid_token: {
            title: "Token trade tidak valid",
            description: "Periksa kembali link yang kamu buka — formatnya tidak sesuai.",
          },
          not_authenticated: {
            title: "Kamu belum login",
            description: "Silakan login terlebih dahulu untuk membuka trade ini.",
          },
          not_found_or_forbidden: {
            title: "Trade tidak bisa diakses",
            description:
              "Link tidak ditemukan, sudah kedaluwarsa, atau ditujukan ke akun lain (recipient berbeda). Pastikan kamu login pakai email yang dituju.",
          },
          network_error: {
            title: "Gagal memuat trade",
            description: "Terjadi kesalahan jaringan. Coba refresh halaman.",
          },
        };
        const m = toastMap[reason];
        toast.error(m.title, { description: m.description });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token, authLoading]);

  // Realtime auto-refresh + fallback reconcile.
  // When the OTHER party changes the trade status (submit / approve / reject),
  // we surface a toast so this user knows immediately without refreshing.
  const lastStatusRef = useRef<string | null>(null);

  // Sync health for the realtime + refetch loop. When refetch fails (offline,
  // 5xx, channel error), we retry with exponential backoff and surface a
  // "Sync gagal" banner with a manual retry button so the user is never stuck.
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "error">("idle");
  const [syncAttempt, setSyncAttempt] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const manualRetryRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!trade?.id) return;
    const tradeId = trade.id;
    const tradeToken = trade.token;
    let cancelled = false;

    // Forward-declared so refetch() can route fresh rows through the same
    // toast/dedup pipeline as realtime — keeps `lastStatusRef` and the
    // debounce map in lockstep no matter which path delivers the change.
    let handleIncomingFn: ((row: TradeRow) => void) | null = null;

    // Exponential-backoff retry loop. `refetch` returns a boolean so the
    // caller can decide whether to schedule another attempt. New triggers
    // (manual retry, online event, poll tick) cancel any in-flight retry
    // chain via `retryToken` so timers never stack.
    const BACKOFF_BASE_MS = 1_000;
    const BACKOFF_MAX_MS = 30_000;
    const BACKOFF_MAX_ATTEMPTS = 6; // ~1 minute total
    let retryToken = 0;
    let retryTimer: number | null = null;

    const refetch = async (): Promise<boolean> => {
      try {
        const fresh = await fetchTradeByToken(tradeToken);
        if (cancelled) return true;
        if (fresh) {
          // Route through handleIncoming so dedup + role-aware toasts fire
          // exactly once even when poll wins the race against realtime.
          if (handleIncomingFn) handleIncomingFn(fresh);
          else setTrade(fresh);
        }
        setSyncState("idle");
        setSyncAttempt(0);
        setLastSyncError(null);
        setLastSyncedAt(Date.now());
        return true;
      } catch (err) {
        if (cancelled) return true;
        setLastSyncError(err instanceof Error ? err.message : "Tidak dapat menjangkau server");
        return false;
      }
    };

    const refetchWithBackoff = async () => {
      const myToken = ++retryToken;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
      setSyncState("syncing");
      for (let attempt = 0; attempt < BACKOFF_MAX_ATTEMPTS; attempt++) {
        if (cancelled || myToken !== retryToken) return;
        setSyncAttempt(attempt + 1);
        const ok = await refetch();
        if (ok || cancelled || myToken !== retryToken) return;
        const exp = Math.min(BACKOFF_BASE_MS * 2 ** attempt, BACKOFF_MAX_MS);
        const delay = Math.floor(Math.random() * exp); // full jitter
        await new Promise<void>((resolve) => {
          retryTimer = window.setTimeout(() => {
            retryTimer = null;
            resolve();
          }, delay);
        });
      }
      // Exhausted attempts — surface error state, keep manual retry available.
      if (!cancelled && myToken === retryToken) setSyncState("error");
    };

    // Expose manual retry to the banner button.
    manualRetryRef.current = () => { void refetchWithBackoff(); };

    // Per-(trade,status) debounce lock — realtime + polling + manual refetch
    // can deliver the same transition multiple times within a few hundred ms
    // (realtime replay on reconnect, poll race, manual retry). We suppress
    // duplicate toasts (and duplicate inventory refreshes) when the same
    // target status fires again within DEBOUNCE_MS.
    //
    // Terminal statuses (accepted/rejected/cancelled/expired) get a much
    // longer TTL: once a trade lands in a final state it must NEVER re-toast,
    // even if a delayed realtime replay arrives minutes later.
    const DEBOUNCE_MS = 1500;
    const TERMINAL_TTL_MS = 24 * 60 * 60 * 1000; // 24h — effectively "forever" for this session
    const TERMINAL_STATUSES = new Set(["accepted", "rejected", "cancelled", "expired"]);
    const lastFiredAt = new Map<string, number>();
    const tryClaimTransition = (statusKey: string) => {
      const now = Date.now();
      const key = `${tradeId}:${statusKey}`;
      const last = lastFiredAt.get(key) ?? 0;
      const ttl = TERMINAL_STATUSES.has(statusKey) ? TERMINAL_TTL_MS : DEBOUNCE_MS;
      if (now - last < ttl) return false;
      lastFiredAt.set(key, now);
      return true;
    };

    const handleIncoming = (next: TradeRow) => {
      const prev = lastStatusRef.current;
      const meIsInitiator = !!user && next.initiator_id === user.id;
      const meIsResponder = !!user && next.responder_id === user.id;
      const role: "initiator" | "responder" | "viewer" =
        meIsInitiator ? "initiator" : meIsResponder ? "responder" : "viewer";

      // Flash the "updating" indicator on every real status transition.
      if (prev && prev !== next.status) markStatusUpdating();

      // Notify on real status transitions caused by the OTHER party.
      // Messages are tailored per role so each user sees the right call-to-action.
      // Debounce-locked per (tradeId,status) so back-to-back deliveries (realtime
      // replay, poll race, manual refetch) only emit one toast per transition.
      if (prev && prev !== next.status && tryClaimTransition(next.status)) {
        const tid = `trade-rt-${tradeId}`;

        if (next.status === "awaiting_initiator") {
          if (role === "initiator") {
            toast.info("Penawaran masuk — giliran kamu", {
              id: tid,
              description: "Responder sudah memilih item. Tinjau & approve dengan PIN (timer 1 jam).",
            });
          } else if (role === "responder") {
            toast.success("Tawaran terkirim", {
              id: tid,
              description: "Menunggu initiator meninjau & menyetujui.",
            });
          } else {
            toast.info("Trade menunggu review initiator", { id: tid });
          }
        } else if (next.status === "accepted") {
          if (role === "initiator") {
            toast.success("Trade selesai — item diterima", {
              id: tid,
              description: "Inventory & saldo koin sudah diperbarui.",
            });
          } else if (role === "responder") {
            toast.success("Trade disetujui initiator", {
              id: tid,
              description: "Item sudah berpindah tangan. Cek inventory kamu.",
            });
          } else {
            toast.success("Trade berhasil dieksekusi", { id: tid });
          }
          // Refresh own balances/inventory in real time.
          Promise.all([refreshInventory(), refreshCoins()]).catch(() => {});
        } else if (next.status === "rejected") {
          if (role === "responder") {
            toast.error("Tawaran kamu ditolak", {
              id: tid,
              description: "Initiator menolak item yang kamu pilih. Buat trade baru jika ingin mencoba lagi.",
            });
          } else if (role === "initiator") {
            toast.info("Kamu menolak tawaran responder", {
              id: tid,
              description: "Trade ditutup. Responder perlu membuat trade baru.",
            });
          } else {
            toast.error("Trade ditolak", { id: tid });
          }
        } else if (next.status === "cancelled") {
          if (role === "initiator") {
            toast.warning("Kamu membatalkan trade", { id: tid });
          } else if (role === "responder") {
            toast.warning("Trade dibatalkan oleh initiator", {
              id: tid,
              description: "Trade ini tidak bisa dilanjutkan.",
            });
          } else {
            toast.warning("Trade dibatalkan", { id: tid });
          }
        } else if (next.status === "expired") {
          if (role === "initiator") {
            toast.error("Trade kedaluwarsa", {
              id: tid,
              description: prev === "awaiting_initiator"
                ? "Window review 1 jam terlewat — kamu tidak sempat approve."
                : "Batas waktu trade habis sebelum responder memilih item.",
            });
          } else if (role === "responder") {
            toast.error("Trade kedaluwarsa", {
              id: tid,
              description: prev === "awaiting_initiator"
                ? "Initiator tidak sempat meninjau dalam 1 jam."
                : "Kamu tidak sempat memilih item sebelum batas waktu.",
            });
          } else {
            toast.error("Trade kedaluwarsa", { id: tid });
          }
        }
      }
      lastStatusRef.current = next.status;
      setTrade(next);
    };

    // Wire the holder so refetch() can dispatch through the same pipeline.
    handleIncomingFn = handleIncoming;

    // Seed last status so we don't fire a notification on first mount.
    lastStatusRef.current = trade.status;

    const channel = supabase
      .channel(`trade-${tradeId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `id=eq.${tradeId}` },
        (payload) => handleIncoming(payload.new as unknown as TradeRow),
      )
      .subscribe((status) => {
        // Channel hiccup — kick a backoff-driven reconcile so we self-heal.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          void refetchWithBackoff();
        }
      });

    const interval = window.setInterval(() => { void refetchWithBackoff(); }, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refetchWithBackoff(); };
    const onOnline = () => { void refetchWithBackoff(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      retryToken++;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      manualRetryRef.current = null;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trade?.id, trade?.token, user?.id]);

  // Use SECURITY DEFINER RPC so both parties can see each other's item details.
  useEffect(() => {
    if (!trade?.id) { setInitiatorItemMeta([]); setResponderItemMetaRemote([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_trade_item_details", { _trade_id: trade.id });
      if (cancelled || !data) return;
      const rows = data as Array<{ item_id: string; side: string; prize_name: string; image_url: string; coin_value: number }>;
      setInitiatorItemMeta(
        rows.filter((r) => r.side === "initiator").map((r) => ({
          id: r.item_id, prize: r.prize_name, image: r.image_url, coin_value: r.coin_value,
        })),
      );
      setResponderItemMetaRemote(
        rows.filter((r) => r.side === "responder").map((r) => ({
          id: r.item_id, prize: r.prize_name, image: r.image_url, coin_value: r.coin_value,
        })),
      );
    })();
    return () => { cancelled = true; };
  }, [trade?.id, trade?.responder_items, trade?.initiator_items, trade?.updated_at]);

  useEffect(() => {
    if (!user) return;
    hasSecurityPin().then(setPinReady).catch(() => setPinReady(false));
  }, [user]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (trade?.status !== "pending" && trade?.status !== "awaiting_initiator") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [trade?.status]);

  const fmtCountdown = (deadlineIso: string | null | undefined) => {
    if (!deadlineIso) return null;
    const expMs = new Date(deadlineIso).getTime();
    const diff = expMs - now;
    const expired = diff <= 0;
    const totalSec = Math.max(0, Math.floor(diff / 1000));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatted = hours > 0
      ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
    const severity: "critical" | "warning" | "normal" = expired
      ? "critical"
      : diff < 60_000 ? "critical"
      : diff < 5 * 60_000 ? "warning"
      : "normal";
    return { expired, totalSec, formatted, severity, diffMs: diff };
  };

  const countdown = useMemo(() => fmtCountdown(trade?.expires_at), [trade?.expires_at, now]);
  const reviewCountdown = useMemo(
    () => trade?.status === "awaiting_initiator" ? fmtCountdown(trade?.review_expires_at) : null,
    [trade?.status, trade?.review_expires_at, now],
  );

  const responderItemMeta = useMemo(
    () => items.filter((it) => responderItems.has(it.id)),
    [items, responderItems],
  );

  /**
   * Two-step flow:
   * - Responder calls with action='submit' + responder_items + PIN -> trade enters 'awaiting_initiator'
   * - Initiator calls with action='approve' + PIN -> swap executes
   * - Initiator calls with action='reject' + PIN -> trade cancelled
   */
  const callTradeExecute = async (action: "submit" | "approve" | "reject") => {
    if (!trade || !user) return;
    if (pinReady === false) { setShowPinSetup(true); return; }
    if (pin.length !== 6) { toast.error("Masukkan PIN 6 digit"); return; }
    if (action === "submit" && responderItems.size === 0) {
      toast.error("Pilih minimal 1 item Tier " + trade.tier_label + " untuk ditukar");
      return;
    }

    setSubmitting(true);
    markStatusUpdating(2500);
    const loadingMsg =
      action === "submit" ? "Mengirim tawaran ke initiator…" :
      action === "approve" ? "Menyetujui & menukar item…" :
      "Menolak trade…";
    toast.loading(loadingMsg, { id: "trade-exec" });
    try {
      const { data, error } = await supabase.functions.invoke("trade-execute", {
        body: {
          trade_id: trade.id,
          pin,
          action,
          responder_items: action === "submit" ? Array.from(responderItems) : undefined,
        },
      });
      if (error) throw error;
      if ((data as { success?: boolean })?.success) {
        const successMsg =
          action === "submit" ? "Tawaran terkirim! Menunggu verifikasi initiator." :
          action === "approve" ? "Trade berhasil! Item sudah berpindah tangan." :
          "Trade ditolak.";
        const successDesc =
          action === "submit" ? "Initiator punya 1 jam untuk meninjau & menyetujui." :
          action === "approve" ? `-${TRADE_GAS_FEE} koin (gas fee).` :
          "Responder harus membuat ulang trade jika ingin mencoba lagi.";
        toast.success(successMsg, { id: "trade-exec", description: successDesc });
        if (action === "approve") {
          await Promise.all([refreshInventory(), refreshCoins()]);
        }
        const updated = await fetchTradeByToken(token);
        setTrade(updated);
        setPin("");
      } else {
        throw new Error("execution_failed");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "execution_failed";
      const map: Record<string, string> = {
        invalid_pin: "PIN salah.",
        invalid_pin_format: "Format PIN tidak valid.",
        invalid_action: "Aksi tidak valid.",
        tier_mismatch: "Tier item kedua belah pihak tidak sama.",
        tier_locked: "Tier C tidak boleh ditrade.",
        items_ownership_failed: "Salah satu item bukan milik kamu lagi.",
        insufficient_gas_fee: `Saldo koin tidak cukup untuk gas fee (${TRADE_GAS_FEE} koin).`,
        missing_responder_items: "Responder belum memilih item.",
        self_trade_forbidden: "Tidak bisa trade dengan diri sendiri.",
        trade_not_pending: "Trade sudah tidak aktif / sudah masuk tahap berikutnya.",
        trade_not_found: "Trade tidak ditemukan.",
        review_window_expired: "Window review 1 jam sudah lewat — trade kedaluwarsa.",
      };
      const friendly = Object.keys(map).find((k) => raw.includes(k));
      toast.error(friendly ? map[friendly] : "Trade gagal", { id: "trade-exec", description: raw });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!trade) return;
    markStatusUpdating(2500);
    try {
      await cancelTrade(trade.id);
      toast.success("Trade dibatalkan");
      const updated = await fetchTradeByToken(token);
      setTrade(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal cancel");
    }
  };

  const handleReject = async () => {
    if (!trade) return;
    markStatusUpdating(2500);
    try {
      await rejectTrade(trade.id);
      toast.success("Trade ditolak");
      const updated = await fetchTradeByToken(token);
      setTrade(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menolak trade");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-4xl px-4 pt-24">
          {/* Header skeleton */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-7 w-64" />
          </div>

          {/* Status card skeleton */}
          <Card className="mb-4 p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full max-w-md" />
                <Skeleton className="mt-2 h-9 w-full rounded-md" />
              </div>
            </div>
          </Card>

          {/* Two-column trade panels skeleton */}
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <Card key={i} className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full rounded-md" />
                  <Skeleton className="h-16 w-full rounded-md" />
                </div>
              </Card>
            ))}
          </div>

          <p
            className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            {authLoading ? "Memeriksa sesi login…" : "Memuat trade…"}
          </p>
        </div>
      </div>
    );
  }

  if (!trade) {
    const reasonCopy: Record<TradeFetchReason, { title: string; hint: string; cta: { label: string; to: string } }> = {
      invalid_token: {
        title: "Token trade tidak valid",
        hint: "Format link salah. Pastikan kamu menyalin link trade lengkap dari pengirim (contoh: https://bushidogacha.com/trade/req/abcd1234).",
        cta: { label: "← Kembali ke Inventory", to: "/inventory" },
      },
      not_authenticated: {
        title: "Kamu belum login",
        hint: "Login dulu pakai akun yang dituju oleh pengirim trade, lalu buka kembali link ini.",
        cta: { label: "Ke halaman login", to: `/login?redirect=/trade/req/${token}` },
      },
      not_found_or_forbidden: {
        title: "Trade tidak bisa diakses",
        hint: "Kemungkinan: (1) link salah/sudah dihapus, (2) trade ini direct-target ke email lain — login pakai email yang dituju pengirim, atau (3) trade sudah kedaluwarsa.",
        cta: { label: "← Kembali ke Inventory", to: "/inventory" },
      },
      network_error: {
        title: "Gagal memuat trade",
        hint: "Cek koneksi internet kamu, lalu refresh halaman ini.",
        cta: { label: "← Kembali ke Inventory", to: "/inventory" },
      },
    };
    const copy = reasonCopy[loadError ?? "not_found_or_forbidden"];
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto max-w-xl px-4 pt-24">
          <Card className="border-destructive/40 bg-destructive/5 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="flex-1">
                <h2 className="font-display text-base font-bold text-destructive">{copy.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{copy.hint}</p>
                {user?.email && loadError === "not_found_or_forbidden" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Saat ini kamu login sebagai{" "}
                    <span className="font-mono text-foreground">{user.email}</span>.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(copy.cta.to)}>
                    {copy.cta.label}
                  </Button>
                  {loadError === "network_error" && (
                    <Button size="sm" onClick={() => window.location.reload()}>
                      Refresh halaman
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const fmtTs = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("id-ID", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  const statusMeta: Record<TradeRow["status"], { label: string; variant: "default" | "secondary" | "destructive" | "outline"; Icon: typeof CircleDot; description: string }> = {
    pending: {
      label: "Menunggu Responder", variant: "secondary",
      Icon: Hourglass,
      description: "Menunggu responder memilih item & memverifikasi (PIN tahap 1).",
    },
    awaiting_initiator: {
      label: "Menunggu Verifikasi Initiator", variant: "secondary",
      Icon: ShieldCheck,
      description: "Responder sudah memilih item & memverifikasi. Initiator harus meninjau & menyetujui (PIN tahap 2) dalam 1 jam.",
    },
    accepted: {
      label: "Selesai", variant: "default",
      Icon: CheckCircle2,
      description: "Trade berhasil. Item telah berpindah tangan.",
    },
    rejected: {
      label: "Ditolak", variant: "destructive",
      Icon: XCircle,
      description: "Trade ditolak.",
    },
    cancelled: {
      label: "Dibatalkan", variant: "outline",
      Icon: Ban,
      description: "Trade dibatalkan oleh inisiator.",
    },
    expired: {
      label: "Kedaluwarsa", variant: "outline",
      Icon: Clock,
      description: "Trade kedaluwarsa sebelum diselesaikan.",
    },
  };
  const sMeta = statusMeta[trade.status];

  // Step 1: Responder picks items + PIN
  const canResponderSubmit = trade.status === "pending" && !!user && !isInitiator;
  // Step 2: Initiator reviews + approves or rejects with PIN
  const canInitiatorReview = trade.status === "awaiting_initiator" && !!user && isInitiator;

  type TimelineKind = "created" | "accepted" | "rejected" | "cancelled" | "expired" | "expiring";
  type TimelineEvent = {
    ts: string;
    label: string;
    done: boolean;
    Icon: typeof CircleDot;
    kind: TimelineKind;
    actor: string;
    actorRole: "initiator" | "responder" | "system";
    items: Array<{ id: string; prize: string; image: string; coin_value: number }>;
    itemsLabel: string;
    detailNote?: string;
  };

  const initiatorActor = isInitiator ? "Kamu (initiator)" : "Initiator";
  const responderActor = isResponder ? "Kamu (responder)" : trade.responder_id ? "Responder" : "Belum ada responder";

  const timeline: TimelineEvent[] = [
    {
      ts: trade.created_at,
      label: "Trade dibuat oleh inisiator",
      done: true,
      Icon: ArrowLeftRight,
      kind: "created",
      actor: initiatorActor,
      actorRole: "initiator",
      items: initiatorItemMeta,
      itemsLabel: `Initiator menawarkan ${trade.initiator_items?.length ?? 0} item Tier ${trade.tier_label}`,
      detailNote: trade.message ? `Pesan: "${trade.message}"` : undefined,
    },
  ];
  if (trade.responded_at) {
    const respLabelMap: Record<string, string> = {
      accepted: "Trade diselesaikan oleh responder",
      rejected: "Trade ditolak oleh responder",
      cancelled: "Trade dibatalkan",
      expired: "Trade kedaluwarsa",
    };
    const kind = (trade.status as TimelineKind);
    timeline.push({
      ts: trade.responded_at,
      label: respLabelMap[trade.status] ?? `Status: ${trade.status}`,
      done: true,
      Icon: trade.status === "accepted" ? CheckCircle2 : XCircle,
      kind,
      actor: kind === "cancelled" ? initiatorActor : responderActor,
      actorRole: kind === "cancelled" ? "initiator" : "responder",
      items: kind === "accepted" ? responderItemMetaRemote : [],
      itemsLabel: kind === "accepted"
        ? `Responder menyetujui dengan ${trade.responder_items?.length ?? 0} item Tier ${trade.tier_label}`
        : kind === "rejected"
          ? "Tidak ada item yang ditukar."
          : kind === "cancelled"
            ? "Initiator membatalkan sebelum diselesaikan."
            : "Sistem menandai trade ini kedaluwarsa.",
      detailNote: kind === "accepted" ? `Gas fee ${TRADE_GAS_FEE} koin dikenakan ke kedua belah pihak.` : undefined,
    });
  } else if (trade.status === "pending") {
    timeline.push({
      ts: trade.expires_at,
      label: "Akan kedaluwarsa",
      done: false,
      Icon: Hourglass,
      kind: "expiring",
      actor: "Sistem (auto-expire)",
      actorRole: "system",
      items: [],
      itemsLabel: "Belum ada item yang berpindah tangan.",
      detailNote: "Trade otomatis dibatalkan bila responder tidak merespons sebelum waktu ini.",
    });
  }

  const selectedEvent = selectedEventIdx !== null ? timeline[selectedEventIdx] ?? null : null;

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 pt-24">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <ArrowLeftRight className="h-3 w-3" />
              <span>Trade Request</span>
              <Badge variant={sMeta.variant} className="text-[10px]">{sMeta.label}</Badge>
            </div>
            <h1 className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
              Tukar Item Tier {trade.tier_label}
            </h1>
          </div>
        </div>

        {trade.message && (
          <Card className="mb-4 bg-muted/40 p-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Pesan:</span> {trade.message}
          </Card>
        )}

        {/* Sync health banner — auto-retry with backoff + manual retry button. */}
        {(syncState === "syncing" && syncAttempt > 1) || syncState === "error" ? (
          <Card
            className={cn(
              "mb-4 border-l-4 p-3 transition-colors",
              syncState === "error"
                ? "border-destructive/60 bg-destructive/10 text-destructive"
                : "border-accent/60 bg-accent/10 text-accent",
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                {syncState === "syncing"
                  ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                  : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {syncState === "syncing"
                      ? `Mencoba menyinkronkan ulang… (percobaan ${syncAttempt})`
                      : "Sinkronisasi gagal"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-foreground/80">
                    {syncState === "syncing"
                      ? "Koneksi sedang dipulihkan. Halaman akan otomatis ter-update."
                      : (lastSyncError ?? "Tidak dapat menjangkau server.") + " Tekan Coba lagi untuk sinkron manual."}
                  </p>
                </div>
              </div>
              {syncState === "error" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5"
                  onClick={() => manualRetryRef.current?.()}
                >
                  <Loader2 className="h-3.5 w-3.5" />
                  Coba lagi
                </Button>
              )}
            </div>
          </Card>
        ) : null}

        {/* Role-aware CTA banner — updates live on realtime status changes */}
        {(() => {
          type Tone = "info" | "success" | "warning" | "danger" | "neutral";
          type CTA = { tone: Tone; Icon: typeof CircleDot; title: string; body: string } | null;
          const role: "initiator" | "responder" | "viewer" =
            isInitiator ? "initiator" : isResponder ? "responder" : "viewer";

          const cta: CTA = (() => {
            switch (trade.status) {
              case "pending":
                if (role === "responder") return {
                  tone: "info", Icon: Package,
                  title: "Giliran kamu — pilih item untuk ditukar",
                  body: "Pilih item Tier " + trade.tier_label + " yang ingin kamu tawarkan, lalu konfirmasi dengan PIN keamanan.",
                };
                if (role === "initiator") return {
                  tone: "neutral", Icon: Hourglass,
                  title: "Menunggu responder memilih item",
                  body: "Bagikan link trade ini ke partner. Kamu akan dapat notifikasi begitu mereka mengirim tawaran.",
                };
                return { tone: "neutral", Icon: ArrowLeftRight, title: "Trade terbuka", body: "Trade ini sedang menunggu responder." };
              case "awaiting_initiator":
                if (role === "initiator") return {
                  tone: "warning", Icon: ShieldCheck,
                  title: "Tinjau & approve dalam 1 jam",
                  body: "Responder sudah mengirim item. Periksa penawaran lalu approve / reject dengan PIN sebelum window review berakhir.",
                };
                if (role === "responder") return {
                  tone: "info", Icon: Hourglass,
                  title: "Tawaran terkirim — menunggu initiator",
                  body: "Initiator punya waktu 1 jam untuk meninjau item kamu. Halaman akan ter-update otomatis.",
                };
                return { tone: "neutral", Icon: ShieldCheck, title: "Menunggu review initiator", body: "Initiator sedang meninjau penawaran responder." };
              case "accepted":
                return {
                  tone: "success", Icon: CheckCircle2,
                  title: role === "responder" ? "Trade disetujui — item sudah masuk inventory" : "Trade selesai — item berpindah tangan",
                  body: "Saldo koin & inventory sudah diperbarui otomatis. Tidak ada tindakan lebih lanjut yang dibutuhkan.",
                };
              case "rejected":
                if (role === "responder") return {
                  tone: "danger", Icon: XCircle,
                  title: "Tawaran kamu ditolak initiator",
                  body: "Trade ini ditutup. Kamu bisa membuat trade baru jika masih ingin menukar.",
                };
                if (role === "initiator") return {
                  tone: "neutral", Icon: XCircle,
                  title: "Kamu menolak tawaran responder",
                  body: "Trade telah ditutup. Tidak ada item yang berpindah tangan.",
                };
                return { tone: "danger", Icon: XCircle, title: "Trade ditolak", body: "Tidak ada item yang ditukar." };
              case "cancelled":
                return {
                  tone: "warning", Icon: Ban,
                  title: role === "initiator" ? "Kamu membatalkan trade" : "Trade dibatalkan oleh initiator",
                  body: "Trade ini tidak bisa dilanjutkan. Buat trade baru bila masih ingin menukar.",
                };
              case "expired":
                return {
                  tone: "danger", Icon: AlertTriangle,
                  title: "Trade kedaluwarsa",
                  body: role === "initiator"
                    ? "Window review 1 jam terlewat — trade otomatis ditutup tanpa eksekusi."
                    : role === "responder"
                      ? "Initiator tidak meninjau tepat waktu. Buat trade baru bila ingin mencoba lagi."
                      : "Batas waktu trade habis sebelum diselesaikan.",
                };
              default:
                return null;
            }
          })();

          if (!cta) return null;

          const toneClasses: Record<Tone, string> = {
            info: "border-primary/40 bg-primary/10 text-primary",
            success: "border-primary/50 bg-primary/10 text-primary",
            warning: "border-accent/40 bg-accent/10 text-accent",
            danger: "border-destructive/50 bg-destructive/10 text-destructive",
            neutral: "border-border bg-muted/40 text-muted-foreground",
          };

          return (
            <Card
              className={cn(
                "relative mb-4 overflow-hidden border-l-4 p-4 transition-all duration-300",
                toneClasses[cta.tone],
                statusUpdating && "ring-1 ring-primary/40",
              )}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <cta.Icon className={cn("mt-0.5 h-5 w-5 shrink-0", statusUpdating && "animate-pulse")} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider">
                      {cta.title}
                    </h3>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {role === "viewer" ? "Pengamat" : role === "initiator" ? "Initiator" : "Responder"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-foreground/80">{cta.body}</p>
                </div>
              </div>
            </Card>
          );
        })()}

        {/* Status panel */}
        <Card className={cn("relative mb-4 p-4 overflow-hidden transition-shadow", statusUpdating && "ring-1 ring-primary/40")}>
          {statusUpdating && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-muted"
              role="progressbar"
              aria-label="Memperbarui status trade"
            >
              <div className="h-full w-1/4 animate-status-bar bg-primary" />
            </div>
          )}
          <div className="flex items-start gap-3">
            <sMeta.Icon className={cn("mt-0.5 h-5 w-5 shrink-0 text-primary", statusUpdating && "animate-pulse")} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                  Status: {sMeta.label}
                </h2>
                {statusUpdating && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary"
                    aria-live="polite"
                  >
                    <Loader2 className="h-3 w-3 animate-spin" /> sync…
                  </span>
                )}
              </div>
              {statusUpdating ? (
                <Skeleton className="mt-1 h-3 w-3/4" />
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{sMeta.description}</p>
              )}

              {trade.status === "pending" && countdown && (
                <div
                  role={countdown.severity === "critical" ? "alert" : undefined}
                  aria-live={countdown.severity === "normal" ? "off" : "polite"}
                  className={cn(
                    "mt-3 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs",
                    countdown.severity === "critical" && "border-destructive/60 bg-destructive/10 text-destructive animate-pulse",
                    countdown.severity === "warning" && "border-accent/60 bg-accent/10 text-accent",
                    countdown.severity === "normal" && "border-border bg-muted/40 text-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {countdown.severity === "critical"
                      ? <AlertTriangle className="h-4 w-4 shrink-0" />
                      : countdown.severity === "warning"
                        ? <Timer className="h-4 w-4 shrink-0" />
                        : <Clock className="h-4 w-4 shrink-0" />}
                    <span className="uppercase tracking-wider">
                      {countdown.expired
                        ? "Trade kedaluwarsa"
                        : countdown.severity === "critical"
                          ? "Hampir kedaluwarsa"
                          : countdown.severity === "warning"
                            ? "Segera kedaluwarsa"
                            : "Kedaluwarsa dalam"}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {countdown.expired ? "00:00" : countdown.formatted}
                  </span>
                </div>
              )}

              {trade.status === "awaiting_initiator" && reviewCountdown && (
                <div
                  role={reviewCountdown.severity === "critical" ? "alert" : undefined}
                  aria-live={reviewCountdown.severity === "normal" ? "off" : "polite"}
                  className={cn(
                    "mt-3 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs",
                    reviewCountdown.severity === "critical" && "border-destructive/60 bg-destructive/10 text-destructive animate-pulse",
                    reviewCountdown.severity === "warning" && "border-accent/60 bg-accent/10 text-accent",
                    reviewCountdown.severity === "normal" && "border-primary/60 bg-primary/10 text-primary",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="uppercase tracking-wider">
                      {reviewCountdown.expired
                        ? (isInitiator
                            ? "Window review terlewat — kamu tidak sempat approve"
                            : isResponder
                              ? "Initiator tidak meninjau tepat waktu"
                              : "Window review 1 jam kedaluwarsa")
                        : (isInitiator
                            ? "Sisa waktu kamu untuk approve"
                            : isResponder
                              ? "Menunggu approval initiator dalam"
                              : "Sisa window review (1 jam)")}
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-foreground">
                    {reviewCountdown.expired ? "00:00" : reviewCountdown.formatted}
                  </span>
                </div>
              )}

              {/* Timeline */}
              <div className="mt-3 space-y-1.5 border-l border-border pl-3">
                {timeline.map((ev, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setSelectedEventIdx(idx)}
                    aria-label={`Detail langkah: ${ev.label}`}
                    className="group flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <ev.Icon className={cn(
                      "mt-0.5 h-3 w-3 shrink-0",
                      ev.done ? "text-primary" : "text-muted-foreground",
                    )} />
                    <div className="min-w-0 flex-1">
                      <div className={cn(
                        "flex items-center gap-1",
                        ev.done ? "text-foreground" : "text-muted-foreground",
                      )}>
                        <span className="truncate">{ev.label}</span>
                        <span className="text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          [detail]
                        </span>
                      </div>
                      <div className="text-muted-foreground/70">{fmtTs(ev.ts)}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Exchange summary */}
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Ditawarkan</div>
                  <div className="font-semibold text-foreground">{trade.initiator_items?.length ?? 0} item</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">Tier</div>
                  <div className="font-semibold text-foreground">{trade.tier_label}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Diterima</div>
                  <div className="font-semibold text-foreground">{trade.responder_items?.length ?? 0} item</div>
                </div>
              </div>

              {(initiatorItemMeta.length > 0 || responderItemMetaRemote.length > 0) && (
                <div className="mt-3 overflow-hidden rounded-md border border-border bg-muted/20">
                  <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 border-b border-border bg-muted/40 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>Asal</span>
                    <span>Item</span>
                    <span>Tier</span>
                    <span className="text-right">Coin</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {initiatorItemMeta.map((it) => (
                      <button
                        key={`i-${it.id}`}
                        type="button"
                        onClick={() => setItemDetail({ ...it, side: "initiator" })}
                        className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 border-b border-border/60 px-2 py-1 text-left text-xs transition-colors last:border-b-0 hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
                        aria-label={`Detail item ${it.prize}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <img src={supabaseImg(it.image, 64)} alt="" loading="lazy"
                            className="h-6 w-6 rounded-sm border border-border bg-muted object-contain" />
                          <span className="text-[10px] text-muted-foreground">A→B</span>
                        </div>
                        <span className="truncate text-foreground">{it.prize}</span>
                        <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", tierBadgeClass(trade.tier_label))}>{trade.tier_label}</span>
                        <span className="text-right text-accent">+{it.coin_value}</span>
                      </button>
                    ))}
                    {responderItemMetaRemote.map((it) => (
                      <button
                        key={`r-${it.id}`}
                        type="button"
                        onClick={() => setItemDetail({ ...it, side: "responder" })}
                        className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 border-b border-border/60 px-2 py-1 text-left text-xs transition-colors last:border-b-0 hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
                        aria-label={`Detail item ${it.prize}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <img src={supabaseImg(it.image, 64)} alt="" loading="lazy"
                            className="h-6 w-6 rounded-sm border border-border bg-muted object-contain" />
                          <span className="text-[10px] text-muted-foreground">B→A</span>
                        </div>
                        <span className="truncate text-foreground">{it.prize}</span>
                        <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", tierBadgeClass(trade.tier_label))}>{trade.tier_label}</span>
                        <span className="text-right text-accent">+{it.coin_value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Two-side view */}
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">Ditawarkan oleh Initiator</span>
              <Badge variant="secondary" className="text-[10px]">Tier {trade.tier_label}</Badge>
            </div>
            {initiatorItemMeta.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Memuat…</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {initiatorItemMeta.map((it) => (
                  <div key={it.id} className="rounded-md border border-border bg-muted/30 p-2">
                    <div className="aspect-square overflow-hidden rounded-sm bg-muted">
                      <img src={supabaseImg(it.image, 200)} alt={it.prize} loading="lazy"
                        className="h-full w-full object-contain" />
                    </div>
                    <div className="mt-1 truncate text-xs text-foreground">{it.prize}</div>
                    <div className="text-[10px] text-accent">+{it.coin_value} coin</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-3">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">Tawaran Kamu</span>
              <ArrowLeftRight className="h-4 w-4 text-primary" />
            </div>
            {!user ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Login dulu untuk merespons trade ini.
                <div className="mt-2">
                  <Button size="sm" onClick={() => navigate("/login")}>Login</Button>
                </div>
              </div>
            ) : isInitiator ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Ini trade kamu sendiri — bagikan link-nya ke partner.
              </div>
            ) : trade.status !== "pending" ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Trade sudah {sMeta.label.toLowerCase()}.</div>
            ) : (
              <InventoryItemPicker
                lockedTier={trade.tier_label}
                selectedIds={responderItems}
                onChange={setResponderItems}
                emptyMessage={`Kamu tidak punya item Tier ${trade.tier_label}.`}
              />
            )}
          </Card>
        </div>

        {/* STEP 1: Responder submits items + PIN */}
        {canResponderSubmit && (
          <Card ref={pinPanelRef} className="mt-4 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Tahap 1/2 — Kirim tawaran kamu + PIN
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Setelah kamu konfirmasi, initiator akan meninjau item kamu & memberi persetujuan akhir (tahap 2). Item baru berpindah setelah initiator setuju.
            </p>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={pin} onChange={setPin} disabled={submitting}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="mt-3 rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
              <div><span className="font-semibold text-primary">Gas fee:</span> {TRADE_GAS_FEE} koin (saat trade selesai)</div>
              <div><span className="font-semibold text-primary">Tawaran kamu:</span> {responderItemMeta.length} item Tier {trade.tier_label}</div>
            </div>
            <Button
              onClick={() => callTradeExecute("submit")}
              disabled={submitting || pin.length !== 6 || responderItems.size === 0}
              className="mt-3 w-full"
              size="lg"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Mengirim…</>
              ) : (
                <><ShieldCheck className="mr-2 h-4 w-4" /> Kirim Tawaran &amp; PIN (Tahap 1)</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="mt-2 w-full text-destructive hover:bg-destructive/10"
            >
              <XCircle className="mr-1 h-4 w-4" /> Tolak Trade
            </Button>
          </Card>
        )}

        {/* STEP 2: Initiator reviews responder's offer + PIN */}
        {canInitiatorReview && (
          <Card ref={pinPanelRef} className="mt-4 border-primary/40 bg-primary/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Tahap 2/2 — Verifikasi item dari responder
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              Responder telah memilih <span className="font-semibold text-foreground">{responderItemMetaRemote.length} item Tier {trade.tier_label}</span> di bawah. Cek apakah sesuai harapan kamu, lalu masukkan PIN untuk menyetujui & menukar item secara final.
            </p>

            {responderItemMetaRemote.length > 0 && (
              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {responderItemMetaRemote.map((it) => (
                  <div key={it.id} className="rounded-md border border-primary/30 bg-card p-2">
                    <div className="aspect-square overflow-hidden rounded-sm bg-muted">
                      <img src={supabaseImg(it.image, 200)} alt={it.prize} loading="lazy" className="h-full w-full object-contain" />
                    </div>
                    <div className="mt-1 truncate text-xs text-foreground">{it.prize}</div>
                    <div className="text-[10px] text-accent">+{it.coin_value} coin</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-center">
              <InputOTP maxLength={6} value={pin} onChange={setPin} disabled={submitting}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="mt-3 rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
              <div><span className="font-semibold text-primary">Gas fee:</span> {TRADE_GAS_FEE} koin (kedua belah pihak)</div>
              <div><span className="font-semibold text-primary">Pertukaran:</span> {initiatorItemMeta.length} ↔ {responderItemMetaRemote.length} item</div>
            </div>

            <Button
              onClick={() => callTradeExecute("approve")}
              disabled={submitting || pin.length !== 6}
              className="mt-3 w-full"
              size="lg"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menukar item…</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Setujui &amp; Tukar (Final)</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => callTradeExecute("reject")}
              disabled={submitting || pin.length !== 6}
              className="mt-2 w-full text-destructive hover:bg-destructive/10"
            >
              <XCircle className="mr-1 h-4 w-4" /> Tolak — item tidak sesuai (butuh PIN)
            </Button>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Menolak akan membatalkan trade total. Responder harus membuat ulang trade jika ingin mencoba lagi.
            </p>
          </Card>
        )}

        {isInitiator && trade.status === "pending" && (
          <div className="mt-3 text-right">
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10"
              onClick={handleCancel}>
              Batalkan Trade
            </Button>
          </div>
        )}

        {(trade.status === "accepted" || trade.status === "rejected" || trade.status === "cancelled" || trade.status === "expired") && (
          <Card className="mt-4 flex flex-wrap items-center justify-between gap-2 p-3">
            <div className="text-xs text-muted-foreground">
              Trade sudah {sMeta.label.toLowerCase()}.
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate("/inventory")}>
                ← Inventory
              </Button>
              <Button size="sm" onClick={() => navigate("/trade/new")}>
                <ArrowLeftRight className="mr-1 h-4 w-4" /> Trade Baru
              </Button>
            </div>
          </Card>
        )}
      </div>

      <SecurityPinDialog open={showPinSetup} onOpenChange={setShowPinSetup} onReady={() => setPinReady(true)} />

      {/* Timeline event detail modal */}
      <Dialog open={selectedEvent !== null} onOpenChange={(o) => !o && setSelectedEventIdx(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm uppercase tracking-wider">
                  <selectedEvent.Icon className="h-4 w-4 text-primary" />
                  {selectedEvent.label}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Detail langkah trade · event #{(selectedEventIdx ?? 0) + 1}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-[80px_1fr] gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
                  <span className="text-muted-foreground">Aktor</span>
                  <span className="flex items-center gap-1.5 text-foreground">
                    <User className="h-3 w-3 text-primary" />
                    <span>{selectedEvent.actor}</span>
                    <Badge variant="outline" className="text-[9px]">{selectedEvent.actorRole}</Badge>
                  </span>

                  <span className="text-muted-foreground">Waktu</span>
                  <span className="text-foreground">
                    {fmtTs(selectedEvent.ts)}
                    <div className="text-[10px] text-muted-foreground/70">{selectedEvent.ts}</div>
                  </span>

                  <span className="text-muted-foreground">Status</span>
                  <span>
                    <Badge variant={sMeta.variant} className="text-[10px]">{selectedEvent.kind}</Badge>
                  </span>
                </div>

                <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
                  <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                    <Package className="h-3 w-3 text-primary" />
                    <span>Item</span>
                  </div>
                  <p className="text-foreground">{selectedEvent.itemsLabel}</p>

                  {selectedEvent.items.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {selectedEvent.items.map((it) => (
                        <div key={it.id} className="flex items-center gap-1.5 rounded border border-border bg-muted/40 p-1.5">
                          <img
                            src={supabaseImg(it.image, 64)}
                            alt=""
                            loading="lazy"
                            className="h-7 w-7 shrink-0 rounded-sm border border-border bg-muted object-contain"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[10px] text-foreground">{it.prize}</div>
                            <div className="text-[9px] text-accent">+{it.coin_value} coin</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedEvent.detailNote && (
                  <div className="rounded-md border border-border bg-muted/30 p-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Catatan:</span> {selectedEvent.detailNote}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setSelectedEventIdx(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Item detail modal */}
      <Dialog open={!!itemDetail} onOpenChange={(o) => !o && setItemDetail(null)}>
        <DialogContent className="max-w-sm">
          {itemDetail && trade && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm uppercase tracking-wider">Detail Item</DialogTitle>
                <DialogDescription className="text-xs">
                  Asal: {itemDetail.side === "initiator" ? "Initiator (A→B)" : "Responder (B→A)"}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3">
                <div className="aspect-square w-40 overflow-hidden rounded-md border border-border bg-muted">
                  <img
                    src={supabaseImg(itemDetail.image, 320)}
                    alt={itemDetail.prize}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="w-full space-y-1.5 text-sm">
                  <div className="flex justify-between gap-2 border-b border-border pb-1">
                    <span className="text-muted-foreground">Nama</span>
                    <span className="text-right text-foreground">{itemDetail.prize}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border pb-1">
                    <span className="text-muted-foreground">Tier</span>
                    <Badge variant="secondary">{trade.tier_label}</Badge>
                  </div>
                  <div className="flex justify-between gap-2 border-b border-border pb-1">
                    <span className="text-muted-foreground">Coin Value</span>
                    <span className="text-accent">+{itemDetail.coin_value}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Asal</span>
                    <span className="text-right text-foreground">
                      {itemDetail.side === "initiator" ? "Initiator" : "Responder"}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setItemDetail(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TradeRequest;
