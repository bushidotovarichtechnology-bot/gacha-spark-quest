import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gift, Send, Loader2, Coins, ArrowUpRight, ArrowDownLeft, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";
import { useI18n } from "@/context/I18nContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface GiftRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  receiver_email: string;
  amount: number;
  message: string;
  created_at: string;
}

interface VerifiedRecipient {
  id: string;
  masked_email: string;
  display_name: string;
  avatar_url: string;
}

const GiftCoins = () => {
  const { user } = useAuth();
  const { totalCoins, spendCoins } = useGacha();
  const { t } = useI18n();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState<VerifiedRecipient | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [gifts, setGifts] = useState<GiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("coin_gifts")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setGifts((data as unknown as GiftRecord[]) || []);
        setLoading(false);
      });
  }, [user]);

  // Reset verified recipient if email changes
  useEffect(() => {
    if (recipient) setRecipient(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const coinAmountNum = parseInt(amount) || 0;

  // Unique past recipients (most recent first) — for autocomplete suggestions
  const recentRecipients = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const g of gifts) {
      if (g.sender_id !== user?.id) continue;
      const e = (g.receiver_email || "").toLowerCase().trim();
      if (!e || seen.has(e)) continue;
      seen.add(e);
      out.push(e);
      if (out.length >= 20) break;
    }
    return out;
  })();

  const handleVerify = async () => {
    if (!user || !email || !amount) return;
    if (coinAmountNum < 1) {
      toast({ title: "Error", description: "Jumlah koin minimal 1", variant: "destructive" });
      return;
    }
    if (coinAmountNum > totalCoins) {
      toast({ title: "Koin tidak cukup", description: `Koin kamu hanya ${totalCoins.toLocaleString()}`, variant: "destructive" });
      return;
    }
    if (coinAmountNum > 100000) {
      toast({ title: "Melebihi batas", description: "Maksimal 100.000 koin per pengiriman", variant: "destructive" });
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-gift-recipient", {
        body: { email },
      });
      if (error) throw new Error(error.message || "Gagal verifikasi");
      if (!data?.found) {
        toast({
          title: "Email tidak terdaftar",
          description: data?.error || "Pastikan email penerima sudah terdaftar di Bushido Gacha",
          variant: "destructive",
        });
        return;
      }
      setRecipient(data.receiver);
      setConfirmText("");
      setConfirmOpen(true);
    } catch (err: any) {
      toast({ title: "Gagal verifikasi", description: err.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleConfirmSend = async () => {
    if (!user || !recipient) return;
    if (confirmText.trim().toUpperCase() !== "KIRIM") {
      toast({ title: "Konfirmasi gagal", description: 'Ketik "KIRIM" untuk melanjutkan', variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      // Idempotency key: stable per send attempt to dedupe accidental double-clicks/network retries
      const requestId =
        (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `gift_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const { data, error } = await supabase.functions.invoke("send-gift-coins", {
        body: { receiver_email: email, amount: coinAmountNum, message, request_id: requestId },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Gagal mengirim gift");
      }

      spendCoins(coinAmountNum);
      toast({ title: "Gift Terkirim! 🎉", description: `${coinAmountNum.toLocaleString()} koin berhasil dikirim ke ${recipient.masked_email}` });

      const { data: newGifts } = await supabase
        .from("coin_gifts")
        .select("*")
        .order("created_at", { ascending: false });
      setGifts((newGifts as unknown as GiftRecord[]) || []);

      setEmail("");
      setAmount("");
      setMessage("");
      setRecipient(null);
      setConfirmOpen(false);
      setConfirmText("");
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("backToCampaigns")}
        </Link>

        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-wider text-foreground">Gift Koin</h1>
          <p className="mt-2 text-muted-foreground">Kirim koin ke teman sebagai hadiah</p>
        </div>

        {/* Balance */}
        <div className="mx-auto mb-6 max-w-md">
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Koin</p>
                  <p className="font-display text-xl font-bold text-foreground">{totalCoins.toLocaleString()}</p>
                </div>
              </div>
              <Gift className="h-6 w-6 text-accent/50" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="send" className="mx-auto max-w-md">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Kirim Gift</TabsTrigger>
            <TabsTrigger value="history">
              Riwayat Gift{gifts.length > 0 ? ` (${gifts.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="mt-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Card className="border-border/50">
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Email Penerima</label>
                    <Input
                      type="email"
                      placeholder="teman@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-secondary"
                      list="gift-recent-recipients"
                      autoComplete="off"
                    />
                    {recentRecipients.length > 0 && (
                      <datalist id="gift-recent-recipients">
                        {recentRecipients.map((e) => (
                          <option key={e} value={e} />
                        ))}
                      </datalist>
                    )}
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3 w-3" />
                      {recentRecipients.length > 0
                        ? `Saran dari ${recentRecipients.length} penerima sebelumnya — ketik untuk memfilter`
                        : "Email harus sudah terdaftar di Bushido Gacha"}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Jumlah Koin</label>
                    <Input
                      type="number"
                      placeholder="100"
                      min={1}
                      max={100000}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-secondary"
                    />
                  </div>
                  {coinAmountNum > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="overflow-hidden"
                    >
                      <div className={`rounded-md border p-3 space-y-1.5 ${
                        coinAmountNum > totalCoins
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-accent/30 bg-accent/5"
                      }`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Saldo saat ini</span>
                          <span className="font-mono text-foreground">{totalCoins.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Potongan</span>
                          <span className="font-mono text-red-400">−{coinAmountNum.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-border/50 pt-1.5 flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">Sisa saldo</span>
                          <span className={`font-display text-sm font-bold ${
                            coinAmountNum > totalCoins ? "text-destructive" : "text-accent"
                          }`}>
                            {(totalCoins - coinAmountNum).toLocaleString()}
                          </span>
                        </div>
                        {coinAmountNum > totalCoins && (
                          <p className="flex items-center gap-1 pt-1 text-xs text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            Saldo tidak cukup untuk pengiriman ini
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Pesan (opsional)</label>
                    <Textarea
                      placeholder="Selamat ya! 🎉"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={200}
                      className="bg-secondary"
                      rows={2}
                    />
                  </div>

                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                    <p className="flex items-start gap-2 text-xs text-amber-200/90">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span>Pengiriman koin <strong>tidak dapat dibatalkan</strong>. Pastikan email penerima benar sebelum konfirmasi.</span>
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleVerify}
                    disabled={verifying || sending || !email || !amount}
                  >
                    {verifying ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi...</span>
                    ) : (
                      <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Verifikasi & Lanjutkan</span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              </div>
            ) : gifts.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="py-10 text-center">
                  <Gift className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Belum ada riwayat gift</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Pengiriman koin yang berhasil akan muncul di sini</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {gifts.map((g, i) => {
                  const isSent = g.sender_id === user?.id;
                  const date = new Date(g.created_at);
                  return (
                    <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="border-border/50">
                        <CardContent className="flex items-center gap-3 py-3">
                          <div className={`rounded-full p-2 ${isSent ? "bg-red-500/10" : "bg-green-500/10"}`}>
                            {isSent ? <ArrowUpRight className="h-4 w-4 text-red-400" /> : <ArrowDownLeft className="h-4 w-4 text-green-400" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {isSent ? `Kirim ke ${g.receiver_email}` : "Koin diterima"}
                              </p>
                              <Badge variant="outline" className="border-green-500/40 bg-green-500/10 px-1.5 py-0 text-[10px] text-green-400">
                                <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                                Berhasil
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              {" · "}
                              {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {g.message && <p className="mt-0.5 truncate text-xs text-muted-foreground/70">"{g.message}"</p>}
                          </div>
                          <div className={`font-display text-sm font-bold ${isSent ? "text-red-400" : "text-green-400"}`}>
                            {isSent ? "-" : "+"}{g.amount.toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={(open) => !sending && setConfirmOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Konfirmasi Pengiriman Koin
            </DialogTitle>
            <DialogDescription>
              Periksa kembali detail penerima sebelum mengirim. Transaksi tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          {recipient && (
            <div className="space-y-4">
              {/* Recipient card */}
              <div className="rounded-lg border border-border/60 bg-secondary/50 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={recipient.avatar_url} alt={recipient.display_name} />
                    <AvatarFallback className="bg-accent/20 text-accent">
                      {recipient.display_name?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">{recipient.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{recipient.masked_email}</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-green-400" />
                </div>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 p-4">
                <span className="text-sm text-muted-foreground">Jumlah dikirim</span>
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-accent" />
                  <span className="font-display text-xl font-bold text-foreground">
                    {coinAmountNum.toLocaleString()}
                  </span>
                </div>
              </div>

              {message && (
                <div className="rounded-lg border border-border/60 bg-secondary/30 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Pesan</p>
                  <p className="text-sm text-foreground">"{message}"</p>
                </div>
              )}

              {/* Email match check */}
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs text-amber-200/90">
                  Email yang kamu input: <strong className="text-foreground">{email}</strong>
                </p>
                <p className="mt-1 text-xs text-amber-200/70">
                  Jika ini bukan penerima yang dimaksud, batalkan dan periksa kembali.
                </p>
              </div>

              {/* Type-to-confirm */}
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">
                  Ketik <span className="font-mono text-accent">KIRIM</span> untuk konfirmasi
                </label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="KIRIM"
                  className="bg-secondary font-mono"
                  autoFocus
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmSend}
              disabled={sending || confirmText.trim().toUpperCase() !== "KIRIM"}
              className="flex-1"
            >
              {sending ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</span>
              ) : (
                <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Kirim Sekarang</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GiftCoins;
