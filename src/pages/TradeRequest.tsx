import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, GitMerge, AlertTriangle, ShieldCheck, Terminal, ArrowLeftRight, Clock, CheckCircle2, XCircle, Ban, Hourglass, CircleDot } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";
import { supabase } from "@/integrations/supabase/client";
import InventoryItemPicker from "@/components/trade/InventoryItemPicker";
import SecurityPinDialog from "@/components/trade/SecurityPinDialog";
import { fetchTradeByToken, hasSecurityPin, cancelTrade, TRADE_GAS_FEE, type TradeRow } from "@/lib/tradeApi";
import { supabaseImg } from "@/lib/imageTransform";
import { cn } from "@/lib/utils";

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
  const [responderItemMeta, setResponderItemMeta] = useState<Array<{ id: string; prize: string; image: string; coin_value: number }>>([]);

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

  // Realtime: refetch trade on update.
  useEffect(() => {
    if (!trade?.id) return;
    const channel = supabase
      .channel(`trade-${trade.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trades", filter: `id=eq.${trade.id}` },
        (payload) => setTrade(payload.new as unknown as TradeRow))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [trade?.id]);

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

  // PIN check on mount (only relevant if user is logged in & not initiator's own preview).
  useEffect(() => {
    if (!user) return;
    hasSecurityPin().then(setPinReady).catch(() => setPinReady(false));
  }, [user]);

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

  // Timeline events (chronological)
  const timeline: Array<{ ts: string; label: string; done: boolean; Icon: typeof CircleDot }> = [
    { ts: trade.created_at, label: "Trade dibuat oleh inisiator", done: true, Icon: GitMerge },
  ];
  if (trade.responded_at) {
    const respLabelMap: Record<string, string> = {
      accepted: "Merge diselesaikan oleh responder",
      rejected: "Trade ditolak oleh responder",
      cancelled: "Trade dibatalkan",
      expired: "Trade kedaluwarsa",
    };
    timeline.push({
      ts: trade.responded_at,
      label: respLabelMap[trade.status] ?? `Status: ${trade.status}`,
      done: true,
      Icon: trade.status === "accepted" ? CheckCircle2 : XCircle,
    });
  } else if (trade.status === "pending") {
    timeline.push({
      ts: trade.expires_at, label: "Akan kedaluwarsa", done: false, Icon: Hourglass,
    });
  }

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

              {/* Timeline */}
              <div className="mt-3 space-y-1.5 border-l border-border/50 pl-3">
                {timeline.map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px]">
                    <ev.Icon className={cn(
                      "h-3 w-3 shrink-0 mt-0.5",
                      ev.done ? "text-hacker-green" : "text-muted-foreground",
                    )} />
                    <div className="flex-1">
                      <div className={ev.done ? "text-foreground" : "text-muted-foreground"}>{ev.label}</div>
                      <div className="text-muted-foreground/70">{fmtTs(ev.ts)}</div>
                    </div>
                  </div>
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

        {/* Action area */}
        {canExecute && (
          <div className="mt-4 rounded-lg border-hacker border bg-hacker-surface p-4">
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
      </div>

      <SecurityPinDialog open={showPinSetup} onOpenChange={setShowPinSetup} onReady={() => setPinReady(true)} />
    </div>
  );
};

export default TradeRequest;
