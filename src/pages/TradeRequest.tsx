import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, GitMerge, AlertTriangle, ShieldCheck, Terminal, ArrowLeftRight, Clock, CheckCircle2, XCircle, Ban, Hourglass, CircleDot, Timer, User, Package } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";
import { supabase } from "@/integrations/supabase/client";
import InventoryItemPicker from "@/components/trade/InventoryItemPicker";
import SecurityPinDialog from "@/components/trade/SecurityPinDialog";
import { fetchTradeByToken, hasSecurityPin, cancelTrade, rejectTrade, TRADE_GAS_FEE, type TradeRow } from "@/lib/tradeApi";
import { supabaseImg } from "@/lib/imageTransform";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Map a tier label (S/A/B/C, case-insensitive) to a high-contrast badge
 * className using semantic tokens defined in index.css. Falls back to a
 * neutral muted style for unknown labels.
 */
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
  const { user } = useAuth();
  const { items, refreshInventory, refreshCoins } = useGacha();

  const [trade, setTrade] = useState<TradeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [responderItems, setResponderItems] = useState<Set<string>>(new Set());
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pinReady, setPinReady] = useState<boolean | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [initiatorItemMeta, setInitiatorItemMeta] = useState<Array<{ id: string; prize: string; image: string; coin_value: number }>>([]);
  const [responderItemMetaRemote, setResponderItemMetaRemote] = useState<Array<{ id: string; prize: string; image: string; coin_value: number }>>([]);
  const [selectedEventIdx, setSelectedEventIdx] = useState<number | null>(null);

  const isInitiator = !!user && trade?.initiator_id === user.id;
  const isResponder = !!user && trade?.responder_id === user.id;

  // Load trade by token.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const t = await fetchTradeByToken(token);
        if (!cancelled) setTrade(t);
      } catch {
        if (!cancelled) setTrade(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  // Realtime auto-refresh + fallback reconcile.
  // Subscribes to trade row UPDATEs so status badge, timeline, and exchange
  // table refresh without manual reload. Adds a 30s poll + visibility/online
  // listeners as a safety net for missed realtime events (reconnects, etc.).
  useEffect(() => {
    if (!trade?.id) return;
    const tradeId = trade.id;
    const tradeToken = trade.token;
    let cancelled = false;

    const refetch = async () => {
      try {
        const fresh = await fetchTradeByToken(tradeToken);
        if (!cancelled && fresh) setTrade(fresh);
      } catch {
        /* ignore — next tick will retry */
      }
    };

    const channel = supabase
      .channel(`trade-${tradeId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trades", filter: `id=eq.${tradeId}` },
        (payload) => setTrade(payload.new as unknown as TradeRow),
      )
      .subscribe();

    const interval = window.setInterval(refetch, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    const onOnline = () => refetch();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      supabase.removeChannel(channel);
    };
  }, [trade?.id, trade?.token]);

  // Fetch initiator item metadata (image, name, coin_value) — viewer may not own them.
  useEffect(() => {
    if (!trade?.initiator_items?.length) { setInitiatorItemMeta([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_inventory")
        .select("id, prize_name, image_url, coin_value")
        .in("id", trade.initiator_items);
      if (cancelled || !data) return;
      setInitiatorItemMeta(
        data.map((r) => ({ id: r.id, prize: r.prize_name, image: r.image_url, coin_value: r.coin_value })),
      );
    })();
    return () => { cancelled = true; };
  }, [trade?.initiator_items]);

  // Fetch responder item metadata once trade has them locked in (post-merge or in-flight).
  useEffect(() => {
    if (!trade?.responder_items?.length) { setResponderItemMetaRemote([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_inventory")
        .select("id, prize_name, image_url, coin_value")
        .in("id", trade.responder_items);
      if (cancelled || !data) return;
      setResponderItemMetaRemote(
        data.map((r) => ({ id: r.id, prize: r.prize_name, image: r.image_url, coin_value: r.coin_value })),
      );
    })();
    return () => { cancelled = true; };
  }, [trade?.responder_items]);

  // PIN check on mount (only relevant if user is logged in & not initiator's own preview).
  useEffect(() => {
    if (!user) return;
    hasSecurityPin().then(setPinReady).catch(() => setPinReady(false));
  }, [user]);

  // Live countdown to expiry — ticks every 1s while trade is pending.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (trade?.status !== "pending") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [trade?.status]);

  const countdown = useMemo(() => {
    if (!trade?.expires_at) return null;
    const expMs = new Date(trade.expires_at).getTime();
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
    // Severity tiers: critical <60s, warning <5min, normal otherwise.
    const severity: "critical" | "warning" | "normal" = expired
      ? "critical"
      : diff < 60_000 ? "critical"
      : diff < 5 * 60_000 ? "warning"
      : "normal";
    return { expired, totalSec, formatted, severity, diffMs: diff };
  }, [trade?.expires_at, now]);

  const responderItemMeta = useMemo(
    () => items.filter((it) => responderItems.has(it.id)),
    [items, responderItems],
  );

  const handleExecute = async () => {
    if (!trade || !user) return;
    if (pinReady === false) { setShowPinSetup(true); return; }
    if (pin.length !== 6) { toast.error("Masukkan PIN 6 digit"); return; }
    if (!isInitiator && !isResponder && responderItems.size === 0) {
      toast.error("Pilih minimal 1 item Tier " + trade.tier_label + " untuk ditukar");
      return;
    }

    setSubmitting(true);
    toast.loading("Initiating handshake… verifying SHA-256…", { id: "trade-exec" });
    try {
      const { data, error } = await supabase.functions.invoke("trade-execute", {
        body: {
          trade_id: trade.id,
          pin,
          responder_items: Array.from(responderItems),
        },
      });
      if (error) throw error;
      if ((data as { success?: boolean })?.success) {
        toast.success("Merge Successful · Gas Fee Incurred", {
          id: "trade-exec",
          description: `Trade berhasil. -${TRADE_GAS_FEE} koin (gas fee).`,
        });
        await Promise.all([refreshInventory(), refreshCoins()]);
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
        tier_mismatch: "Tier item kedua belah pihak tidak sama.",
        tier_locked: "Tier C tidak boleh ditrade.",
        items_ownership_failed: "Salah satu item bukan milik kamu lagi.",
        insufficient_gas_fee: `Saldo koin tidak cukup untuk gas fee (${TRADE_GAS_FEE} koin).`,
        missing_responder_items: "Responder belum memilih item.",
        self_trade_forbidden: "Tidak bisa trade dengan diri sendiri.",
        trade_not_pending: "Trade sudah tidak aktif.",
        trade_not_found: "Trade tidak ditemukan.",
      };
      const friendly = Object.keys(map).find((k) => raw.includes(k));
      toast.error(friendly ? map[friendly] : "Merge gagal", { id: "trade-exec", description: raw });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!trade) return;
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
    try {
      await rejectTrade(trade.id);
      toast.success("Trade ditolak");
      const updated = await fetchTradeByToken(token);
      setTrade(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menolak trade");
    }
  };

  const scrollToMergeAction = () => {
    document.getElementById("trade-action-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-hacker-bg scanline">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 font-mono-hacker text-hacker-green">
          <Loader2 className="inline h-4 w-4 animate-spin" /> resolving trade/{token}…
        </div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="min-h-screen bg-hacker-bg scanline">
        <Navbar />
        <div className="container mx-auto max-w-xl px-4 pt-24 font-mono-hacker">
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-center text-destructive">
            <AlertTriangle className="mx-auto mb-2 h-6 w-6" />
            <p className="text-sm">Trade tidak ditemukan atau kamu tidak punya akses.</p>
            <Button variant="outline" className="mt-3" onClick={() => navigate("/inventory")}>
              ← back to /inventory
            </Button>
          </div>
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

  const statusMeta: Record<TradeRow["status"], { label: string; cls: string; panelCls: string; Icon: typeof CircleDot; description: string }> = {
    pending: {
      label: "● waiting", cls: "text-hacker-green border-hacker",
      panelCls: "border-hacker bg-hacker-surface",
      Icon: Hourglass,
      description: "Menunggu responder memilih item & menyetujui merge.",
    },
    accepted: {
      label: "✓ completed", cls: "text-hacker-green border-hacker text-glow-hacker",
      panelCls: "border-hacker bg-hacker-green/5",
      Icon: CheckCircle2,
      description: "Merge berhasil. Item telah berpindah tangan.",
    },
    rejected: {
      label: "✗ rejected", cls: "text-destructive border-destructive/40",
      panelCls: "border-destructive/40 bg-destructive/5",
      Icon: XCircle,
      description: "Trade ditolak oleh responder.",
    },
    cancelled: {
      label: "⊘ cancelled", cls: "text-muted-foreground border-border",
      panelCls: "border-border bg-hacker-surface",
      Icon: Ban,
      description: "Trade dibatalkan oleh inisiator.",
    },
    expired: {
      label: "⏱ expired", cls: "text-muted-foreground border-border",
      panelCls: "border-border bg-hacker-surface",
      Icon: Clock,
      description: "Trade kedaluwarsa sebelum diselesaikan.",
    },
  };
  const sMeta = statusMeta[trade.status];
  const statusBadge = (
    <span className={cn("rounded border px-2 py-0.5 text-[10px] uppercase", sMeta.cls)}>{sMeta.label}</span>
  );

  const canExecute = trade.status === "pending" && !!user && !isInitiator;

  // Timeline events (chronological) — enriched with actor + items for detail modal.
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
      Icon: GitMerge,
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
      accepted: "Merge diselesaikan oleh responder",
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
      detailNote: "Trade otomatis di-expire bila responder tidak merespons sebelum waktu ini.",
    });
  }

  const selectedEvent = selectedEventIdx !== null ? timeline[selectedEventIdx] ?? null : null;

  return (
    <div className="min-h-screen bg-hacker-bg pb-12 scanline">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 pt-24 font-mono-hacker">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase text-hacker-green text-glow-hacker">
              <Terminal className="h-3 w-3" />
              <span>/trade/req/{token.slice(0, 8)}…</span>
              {statusBadge}
            </div>
            <h1 className="mt-1 text-xl font-bold text-hacker-green text-glow-hacker">
              <GitMerge className="mr-1 inline h-5 w-5" /> Pull Request: tier {trade.tier_label}
            </h1>
          </div>
        </div>

        {trade.message && (
          <div className="mb-4 rounded-md border border-border bg-hacker-surface p-3 text-xs text-muted-foreground">
            <span className="text-hacker-green">// message:</span> {trade.message}
          </div>
        )}

        {/* Status panel — clear status, timeline, & exchange summary */}
        <div className={cn("mb-4 rounded-lg border p-4", sMeta.panelCls)}>
          <div className="flex items-start gap-3">
            <sMeta.Icon className={cn("h-5 w-5 shrink-0 mt-0.5", sMeta.cls.split(" ")[0])} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={cn("text-sm font-bold uppercase tracking-wider", sMeta.cls.split(" ")[0])}>
                  status: {trade.status}
                </h2>
                {statusBadge}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{sMeta.description}</p>

              {/* Live countdown — only while pending */}
              {trade.status === "pending" && countdown && (
                <div
                  role={countdown.severity === "critical" ? "alert" : undefined}
                  aria-live={countdown.severity === "normal" ? "off" : "polite"}
                  className={cn(
                    "mt-3 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs",
                    countdown.severity === "critical" && "border-destructive/60 bg-destructive/10 text-destructive animate-pulse",
                    countdown.severity === "warning" && "border-accent/60 bg-accent/10 text-accent",
                    countdown.severity === "normal" && "border-border bg-hacker-bg/40 text-hacker-green",
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
                        ? "trade expired"
                        : countdown.severity === "critical"
                          ? "expiring NOW"
                          : countdown.severity === "warning"
                            ? "expires soon"
                            : "expires in"}
                    </span>
                  </div>
                  <span className={cn(
                    "font-mono-hacker tabular-nums text-sm font-bold",
                    countdown.severity === "critical" && "text-glow-destructive",
                    countdown.severity === "normal" && "text-glow-hacker",
                  )}>
                    {countdown.expired ? "00:00" : countdown.formatted}
                  </span>
                </div>
              )}

              {/* Timeline — each row is clickable for detail modal */}
              <div className="mt-3 space-y-1.5 border-l border-border/50 pl-3">
                {timeline.map((ev, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setSelectedEventIdx(idx)}
                    aria-label={`Detail langkah: ${ev.label}`}
                    className="group flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-[11px] transition-colors hover:bg-hacker-green/10 focus-visible:bg-hacker-green/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-hacker-green/60"
                  >
                    <ev.Icon className={cn(
                      "h-3 w-3 shrink-0 mt-0.5",
                      ev.done ? "text-hacker-green" : "text-muted-foreground",
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "flex items-center gap-1",
                        ev.done ? "text-foreground" : "text-muted-foreground",
                      )}>
                        <span className="truncate">{ev.label}</span>
                        <span className="text-[9px] uppercase text-hacker-green opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          [details]
                        </span>
                      </div>
                      <div className="text-muted-foreground/70">{fmtTs(ev.ts)}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Exchange summary */}
              <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-border/50 bg-hacker-bg/40 p-2 text-[11px]">
                <div>
                  <div className="text-muted-foreground">items_offered</div>
                  <div className="text-hacker-green">{trade.initiator_items?.length ?? 0} item</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">tier</div>
                  <div className="text-hacker-green">{trade.tier_label}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">items_received</div>
                  <div className="text-hacker-green">{trade.responder_items?.length ?? 0} item</div>
                </div>
              </div>

              {/* Compact items table — name + tier + small icon per item */}
              {(initiatorItemMeta.length > 0 || responderItemMetaRemote.length > 0) && (
                <div className="mt-3 overflow-hidden rounded-md border border-border/50 bg-hacker-bg/40">
                  <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-2 border-b border-border/50 bg-hacker-bg/60 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>side</span>
                    <span>item</span>
                    <span>tier</span>
                    <span className="text-right">coin</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {initiatorItemMeta.map((it) => (
                      <div key={`i-${it.id}`} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 border-b border-border/30 px-2 py-1 text-[11px] last:border-b-0">
                        <div className="flex items-center gap-1.5">
                          <img src={supabaseImg(it.image, 64)} alt="" loading="lazy"
                            className="h-6 w-6 rounded-sm border border-border/50 bg-black/40 object-contain" />
                          <span className="text-[9px] text-muted-foreground">A→B</span>
                        </div>
                        <span className="truncate text-foreground">{it.prize}</span>
                        <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", tierBadgeClass(trade.tier_label))}>{trade.tier_label}</span>
                        <span className="text-right text-accent">+{it.coin_value}</span>
                      </div>
                    ))}
                    {responderItemMetaRemote.map((it) => (
                      <div key={`r-${it.id}`} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 border-b border-border/30 px-2 py-1 text-[11px] last:border-b-0">
                        <div className="flex items-center gap-1.5">
                          <img src={supabaseImg(it.image, 64)} alt="" loading="lazy"
                            className="h-6 w-6 rounded-sm border border-border/50 bg-black/40 object-contain" />
                          <span className="text-[9px] text-muted-foreground">B→A</span>
                        </div>
                        <span className="truncate text-foreground">{it.prize}</span>
                        <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", tierBadgeClass(trade.tier_label))}>{trade.tier_label}</span>
                        <span className="text-right text-accent">+{it.coin_value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Git-merge two-branch view */}
        <div className="grid gap-3 md:grid-cols-2">
          {/* Their branch (initiator) */}
          <div className="rounded-lg border-hacker border bg-hacker-surface p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-hacker-green">branch: their_offer</span>
              <span className="rounded bg-hacker-bg px-1.5 py-0.5 text-[10px] text-hacker-green">tier {trade.tier_label}</span>
            </div>
            {initiatorItemMeta.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">// loading…</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {initiatorItemMeta.map((it) => (
                  <div key={it.id} className="rounded-md border border-border bg-hacker-bg p-2">
                    <div className="aspect-square overflow-hidden rounded-sm bg-black/40">
                      <img src={supabaseImg(it.image, 200)} alt={it.prize} loading="lazy"
                        className="h-full w-full object-contain" />
                    </div>
                    <div className="mt-1 truncate text-[10px] text-foreground">{it.prize}</div>
                    <div className="text-[10px] text-accent">+{it.coin_value} coin</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Your branch (responder picker) */}
          <div className="rounded-lg border-hacker border bg-hacker-surface p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-hacker-green">branch: your_offer</span>
              <ArrowLeftRight className="h-3 w-3 text-hacker-green" />
            </div>
            {!user ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                // login dulu untuk merespons trade ini
                <div className="mt-2">
                  <Button size="sm" onClick={() => navigate("/login")}>Login</Button>
                </div>
              </div>
            ) : isInitiator ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                // ini trade kamu sendiri — share link-nya ke partner
              </div>
            ) : trade.status !== "pending" ? (
              <div className="py-6 text-center text-xs text-muted-foreground">// trade sudah {trade.status}</div>
            ) : (
              <InventoryItemPicker
                lockedTier={trade.tier_label}
                selectedIds={responderItems}
                onChange={setResponderItems}
                emptyMessage={`// kamu tidak punya item Tier ${trade.tier_label}`}
              />
            )}
          </div>
        </div>

        {/* Contextual quick actions for responder while waiting */}
        {trade.status === "pending" && !!user && !isInitiator && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={scrollToMergeAction}
              className="bg-hacker-green text-hacker-bg hover:bg-hacker-green/90 font-mono-hacker text-xs uppercase tracking-wider"
            >
              <CheckCircle2 className="mr-1 h-4 w-4" /> accept &amp; merge
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReject}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 font-mono-hacker text-xs uppercase tracking-wider"
            >
              <XCircle className="mr-1 h-4 w-4" /> reject trade
            </Button>
          </div>
        )}

        {/* Action area */}
        {canExecute && (
          <div id="trade-action-panel" className="mt-4 rounded-lg border-hacker border bg-hacker-surface p-4">
            <div className="mb-3 flex items-center gap-2 text-xs text-hacker-green">
              <ShieldCheck className="h-4 w-4" />
              $ enter security PIN to merge
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={pin} onChange={setPin} disabled={submitting}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i}
                      className="border-hacker bg-hacker-bg font-mono-hacker text-hacker-green" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <div className="mt-3 rounded-md border border-border bg-hacker-bg p-2 text-[11px] text-muted-foreground">
              <span className="text-hacker-green">⚡ gas_fee:</span> -{TRADE_GAS_FEE} koin (kedua belah pihak)
              <br />
              <span className="text-hacker-green">⇄ swap:</span> {initiatorItemMeta.length} ↔ {responderItemMeta.length} item
            </div>
            <Button
              onClick={handleExecute}
              disabled={submitting || pin.length !== 6 || responderItems.size === 0}
              className="mt-3 w-full bg-hacker-green text-hacker-bg hover:bg-hacker-green/90 font-mono-hacker text-xs uppercase tracking-wider"
            >
              {submitting ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> verifying SHA-256…</>
              ) : (
                <>git merge --no-ff trade/{trade.tier_label} →</>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="mt-2 w-full border-destructive/40 text-destructive hover:bg-destructive/10 font-mono-hacker text-xs uppercase tracking-wider"
            >
              <XCircle className="mr-1 h-4 w-4" /> reject trade
            </Button>
          </div>
        )}

        {isInitiator && trade.status === "pending" && (
          <div className="mt-3 text-right">
            <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={handleCancel}>
              git revert (cancel)
            </Button>
          </div>
        )}

        {/* Final-state back button */}
        {(trade.status === "accepted" || trade.status === "rejected" || trade.status === "cancelled" || trade.status === "expired") && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-hacker-surface p-3">
            <div className="text-xs text-muted-foreground">
              <span className="text-hacker-green">// session_closed:</span> trade sudah {trade.status}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/inventory")}
                className="font-mono-hacker text-xs uppercase tracking-wider"
              >
                ← back to /inventory
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/trade/new")}
                className="bg-hacker-green text-hacker-bg hover:bg-hacker-green/90 font-mono-hacker text-xs uppercase tracking-wider"
              >
                <GitMerge className="mr-1 h-4 w-4" /> new trade
              </Button>
            </div>
          </div>
        )}
      </div>

      <SecurityPinDialog open={showPinSetup} onOpenChange={setShowPinSetup} onReady={() => setPinReady(true)} />

      {/* Timeline event detail modal */}
      <Dialog open={selectedEvent !== null} onOpenChange={(o) => !o && setSelectedEventIdx(null)}>
        <DialogContent className="border-hacker bg-hacker-surface font-mono-hacker text-foreground sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-hacker-green text-glow-hacker">
                  <selectedEvent.Icon className="h-4 w-4" />
                  {selectedEvent.label}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Detail langkah trade · event #{(selectedEventIdx ?? 0) + 1}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-[80px_1fr] gap-2 rounded-md border border-border/50 bg-hacker-bg/40 p-2">
                  <span className="text-muted-foreground">// actor</span>
                  <span className="flex items-center gap-1.5 text-foreground">
                    <User className="h-3 w-3 text-hacker-green" />
                    <span>{selectedEvent.actor}</span>
                    <span className="rounded border border-border px-1 py-0 text-[9px] uppercase text-muted-foreground">
                      {selectedEvent.actorRole}
                    </span>
                  </span>

                  <span className="text-muted-foreground">// when</span>
                  <span className="text-foreground">
                    {fmtTs(selectedEvent.ts)}
                    <div className="text-[10px] text-muted-foreground/70">{selectedEvent.ts}</div>
                  </span>

                  <span className="text-muted-foreground">// status</span>
                  <span>
                    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] uppercase", sMeta.cls)}>
                      {selectedEvent.kind}
                    </span>
                  </span>
                </div>

                <div className="rounded-md border border-border/50 bg-hacker-bg/40 p-2">
                  <div className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
                    <Package className="h-3 w-3 text-hacker-green" />
                    <span>// items</span>
                  </div>
                  <p className="text-foreground">{selectedEvent.itemsLabel}</p>

                  {selectedEvent.items.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {selectedEvent.items.map((it) => (
                        <div key={it.id} className="flex items-center gap-1.5 rounded border border-border/40 bg-hacker-bg/60 p-1.5">
                          <img
                            src={supabaseImg(it.image, 64)}
                            alt=""
                            loading="lazy"
                            className="h-7 w-7 shrink-0 rounded-sm border border-border/40 bg-black/40 object-contain"
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
                  <div className="rounded-md border border-border/50 bg-hacker-bg/40 p-2 text-muted-foreground">
                    <span className="text-hacker-green">// note:</span> {selectedEvent.detailNote}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEventIdx(null)}
                  className="font-mono-hacker text-xs uppercase tracking-wider"
                >
                  close
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
