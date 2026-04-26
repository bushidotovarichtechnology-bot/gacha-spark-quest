import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, GitBranch, Copy, Check, AlertTriangle, Terminal, Coins, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";
import InventoryItemPicker from "@/components/trade/InventoryItemPicker";
import SecurityPinDialog from "@/components/trade/SecurityPinDialog";
import {
  createTrade,
  hasSecurityPin,
  isTradableTier,
  TRADE_GAS_FEE,
  type TradableTier,
} from "@/lib/tradeApi";

const TradeNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items } = useGacha();
  const [search] = useSearchParams();
  const presetItemId = search.get("item") ?? "";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const set = new Set<string>();
    if (presetItemId) set.add(presetItemId);
    return set;
  });
  const [message, setMessage] = useState("");
  const [pinReady, setPinReady] = useState<boolean | null>(null);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedItems = useMemo(
    () => items.filter((it) => selectedIds.has(it.id)),
    [items, selectedIds],
  );
    const first = items.find((it) => selectedIds.has(it.id));
    if (first && isTradableTier(first.tier)) return first.tier;
    return undefined;
  }, [items, selectedIds]);

  // Check PIN once on mount.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    hasSecurityPin()
      .then((ok) => {
        if (cancelled) return;
        setPinReady(ok);
        if (!ok) setShowPinSetup(true);
      })
      .catch(() => setPinReady(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleCreate = async () => {
    if (!lockedTier) {
      toast.error("Pilih dulu item yang ingin kamu trade.");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Tidak ada item yang dipilih.");
      return;
    }
    setCreating(true);
    try {
      const trade = await createTrade({
        inventoryIds: Array.from(selectedIds),
        tier: lockedTier,
        message: message.trim(),
      });
      setGeneratedToken(trade.token);
      toast.success("Trade Link tergenerate", {
        description: "Bagikan link ini ke calon partner trade-mu.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat trade");
    } finally {
      setCreating(false);
    }
  };

  const tradeUrl = generatedToken
    ? `${window.location.origin}/trade/req/${generatedToken}`
    : "";

  const handleCopy = async () => {
    if (!tradeUrl) return;
    try {
      await navigator.clipboard.writeText(tradeUrl);
      setCopied(true);
      toast.success("Trade Link disalin");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  return (
    <div className="min-h-screen bg-hacker-bg pb-12 scanline">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 pt-24 font-mono-hacker">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-hacker-green text-glow-hacker">
            <Terminal className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest">/trade/new</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-hacker-green text-glow-hacker">
            <GitBranch className="mr-1 inline h-5 w-5" />
            git checkout -b trade/<span className="animate-hacker-blink">_</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Pilih item Tier S/A/B yang akan kamu tawarkan, lalu generate Trade Link untuk dibagikan.
          </p>
        </div>

        {pinReady === false && !showPinSetup && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="flex-1">
              <p className="font-semibold">Security PIN belum diset.</p>
              <p>PIN 6 digit wajib aktif sebelum kamu bisa eksekusi trade.</p>
            </div>
            <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/20"
              onClick={() => setShowPinSetup(true)}>
              Setup PIN
            </Button>
          </div>
        )}

        {!generatedToken ? (
          <div className="space-y-5 rounded-lg border-hacker border bg-hacker-surface p-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase text-hacker-green">$ select items</span>
                {lockedTier && (
                  <span className="rounded border border-hacker bg-hacker-bg px-2 py-0.5 text-[10px] text-hacker-green">
                    locked → tier {lockedTier}
                  </span>
                )}
              </div>
              <InventoryItemPicker
                lockedTier={lockedTier}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                emptyMessage="// no tradable items — drop sesi gacha dulu"
              />
            </div>

            <div>
              <label htmlFor="trade-msg" className="mb-1 block text-xs uppercase text-hacker-green">
                $ optional message
              </label>
              <Textarea
                id="trade-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                placeholder="// e.g. trading my Switch 2 for any iPhone S-tier"
                className="border-hacker bg-hacker-bg font-mono-hacker text-xs text-foreground placeholder:text-muted-foreground/60"
                rows={2}
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{message.length}/200</p>
            </div>

            <div className="rounded-md border border-border bg-hacker-bg p-3 text-[11px] text-muted-foreground">
              <span className="text-hacker-green">⚡ gas_fee:</span> {TRADE_GAS_FEE} koin / pihak (dipotong saat merge berhasil).
              <br />
              <span className="text-hacker-green">⏳ ttl:</span> 24 jam, lalu trade auto-expired.
            </div>

            <Button
              onClick={handleCreate}
              disabled={creating || selectedIds.size === 0 || pinReady === false}
              className="w-full bg-hacker-green text-hacker-bg hover:bg-hacker-green/90 font-mono-hacker text-xs uppercase tracking-wider"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> initiating handshake…
                </>
              ) : (
                <>git push origin trade/{lockedTier ?? "?"} →</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 rounded-lg border-hacker border bg-hacker-surface p-4">
            <div className="text-xs uppercase text-hacker-green text-glow-hacker">
              ✓ trade pushed — share this link
            </div>
            <div className="flex items-center gap-2 rounded-md border-hacker border bg-hacker-bg p-2">
              <code className="flex-1 truncate font-mono-hacker text-xs text-hacker-green">{tradeUrl}</code>
              <Button
                size="sm"
                variant="outline"
                className="border-hacker bg-hacker-bg text-hacker-green hover:bg-hacker-bg/70"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              // bagikan link ke partner trade-mu (WA, Discord, dll). Mereka akan memilih item tier {lockedTier} miliknya untuk
              ditukarkan, lalu kalian berdua input PIN untuk eksekusi.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-hacker bg-hacker-bg text-hacker-green hover:bg-hacker-bg/70"
                onClick={() => navigate(`/trade/req/${generatedToken}`)}>
                buka trade
              </Button>
              <Button variant="outline" className="flex-1 border-border" onClick={() => navigate("/inventory")}>
                back to /inventory
              </Button>
            </div>
          </div>
        )}
      </div>

      <SecurityPinDialog
        open={showPinSetup}
        onOpenChange={setShowPinSetup}
        onReady={() => setPinReady(true)}
      />
    </div>
  );
};

export default TradeNew;
