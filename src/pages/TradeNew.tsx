import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeftRight, Copy, Check, AlertTriangle, Coins, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";
import InventoryItemPicker from "@/components/trade/InventoryItemPicker";
import SecurityPinDialog from "@/components/trade/SecurityPinDialog";
import RecipientPicker, { type ResolvedRecipient } from "@/components/trade/RecipientPicker";
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
  const [recipient, setRecipient] = useState<ResolvedRecipient | null>(null);
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

  const lockedTier: TradableTier | undefined = useMemo(() => {
    const first = selectedItems[0];
    if (first && isTradableTier(first.tier)) return first.tier;
    return undefined;
  }, [selectedItems]);

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

  const openConfirm = () => {
    if (!lockedTier) { toast.error("Pilih dulu item yang ingin kamu trade."); return; }
    if (selectedIds.size === 0) { toast.error("Tidak ada item yang dipilih."); return; }
    const invalid = selectedItems.find((it) => !isTradableTier(it.tier) || it.tier !== lockedTier);
    if (invalid) {
      toast.error(`Item "${invalid.prize}" (Tier ${invalid.tier}) tidak valid untuk trade ini.`);
      return;
    }
    if (pinReady === false) { setShowPinSetup(true); return; }
    setConfirmOpen(true);
  };

  const handleCreate = async () => {
    if (!lockedTier) return;
    setConfirmOpen(false);
    setCreating(true);
    try {
      const trade = await createTrade({
        inventoryIds: Array.from(selectedIds),
        tier: lockedTier,
        message: message.trim(),
        recipientId: recipient?.userId ?? null,
      });
      setGeneratedToken(trade.token);
      toast.success("Trade Link berhasil dibuat", {
        description: recipient
          ? `Notifikasi sudah dikirim ke ${recipient.email}.`
          : "Bagikan link ini ke calon partner trade-mu.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat trade");
    } finally {
      setCreating(false);
    }
  };

  const tradeUrl = generatedToken
    ? `https://bushidogacha.com/trade/req/${generatedToken}`
    : "";

  const handleCopy = async () => {
    if (!tradeUrl) return;
    try {
      await navigator.clipboard.writeText(tradeUrl);
      setCopied(true);
      toast.success("Link disalin");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Gagal menyalin link");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      <div className="container mx-auto max-w-3xl px-4 pt-24">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-primary">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Buat Trade Baru
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
            Tukar Hadiah dengan Pemain Lain
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih item Tier S/A/B yang akan kamu tawarkan, lalu bagikan Trade Link ke partner trade-mu.
          </p>
        </div>

        {pinReady === false && !showPinSetup && (
          <Card className="mb-4 flex items-start gap-2 border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <div className="flex-1">
              <p className="font-semibold">Security PIN belum diset.</p>
              <p className="text-xs">PIN 6 digit wajib aktif sebelum kamu bisa eksekusi trade.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowPinSetup(true)}>
              Setup PIN
            </Button>
          </Card>
        )}

        {!generatedToken ? (
          <Card className="space-y-5 p-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Pilih Item</span>
                {lockedTier && (
                  <Badge variant="secondary" className="text-xs">
                    Tier {lockedTier} terkunci
                  </Badge>
                )}
              </div>
              <InventoryItemPicker
                lockedTier={lockedTier}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                emptyMessage="Belum ada item tradable. Lakukan gacha dulu untuk mendapatkan item Tier S/A/B."
              />
            </div>

            <div>
              <label htmlFor="trade-msg" className="mb-1 block text-sm font-medium text-foreground">
                Pesan <span className="text-muted-foreground font-normal">(opsional)</span>
              </label>
              <Textarea
                id="trade-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                placeholder="Contoh: nyari iPhone tier S, tukar Switch 2 saya"
                rows={2}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/200</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Penerima <span className="text-muted-foreground font-normal">(opsional)</span>
              </label>
              <RecipientPicker value={recipient} onChange={setRecipient} />
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <div className="flex items-center gap-1.5 text-primary">
                <Coins className="h-4 w-4" />
                <span className="font-semibold">Gas fee {TRADE_GAS_FEE} koin per pihak</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Dipotong otomatis dari saldo koin saat trade berhasil. Trade berlaku 24 jam.
              </div>
            </div>

            <Button
              onClick={openConfirm}
              disabled={creating || selectedIds.size === 0 || pinReady === false}
              className="w-full"
              size="lg"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Membuat trade…
                </>
              ) : (
                <>
                  <ArrowLeftRight className="mr-2 h-4 w-4" />
                  Buat Trade Link
                </>
              )}
            </Button>
          </Card>
        ) : (
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" />
              Trade Link berhasil dibuat
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
              <code className="flex-1 truncate text-xs text-foreground">{tradeUrl}</code>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Bagikan link ke partner trade-mu (WhatsApp, Discord, dll). Mereka akan memilih item
              tier {lockedTier} miliknya untuk ditukarkan, lalu kalian berdua input PIN untuk eksekusi.
            </p>
            <div className="flex gap-2">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => navigate(`/trade/req/${generatedToken}`)}
              >
                Buka Trade
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/inventory")}
              >
                Kembali ke Inventory
              </Button>
            </div>
          </Card>
        )}
      </div>

      <SecurityPinDialog
        open={showPinSetup}
        onOpenChange={setShowPinSetup}
        onReady={() => setPinReady(true)}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Konfirmasi Trade
            </AlertDialogTitle>
            <AlertDialogDescription>
              Periksa detail di bawah sebelum trade link dibuat.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  Item Ditawarkan
                </span>
                <Badge variant="secondary" className="text-xs">Tier {lockedTier}</Badge>
              </div>
              <ul className="space-y-1 text-foreground">
                {selectedItems.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-2 truncate">
                    <span className="truncate">• {it.prize}</span>
                    <span className="flex items-center gap-0.5 text-accent">
                      <Coins className="h-3 w-3" />{it.coinValue}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 text-xs text-muted-foreground">
                Total: {selectedItems.length} item
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="text-xs font-medium uppercase text-muted-foreground">Penerima</div>
              <div className="mt-1 text-foreground">
                {recipient ? (
                  <>
                    Langsung ke <span className="font-semibold text-primary">{recipient.email}</span>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Hanya recipient yang melihat trade & menerima notifikasi.
                    </div>
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Open Trade Link</span>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Siapa saja dengan link bisa merespons.
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-primary">
                  <Coins className="h-4 w-4" />
                  <span className="font-semibold">Gas Fee</span>
                </span>
                <span className="font-bold text-primary">{TRADE_GAS_FEE} koin / pihak</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Dipotong dari saldo masing-masing pihak hanya jika trade berhasil.
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreate}>
              Buat Trade Link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TradeNew;
