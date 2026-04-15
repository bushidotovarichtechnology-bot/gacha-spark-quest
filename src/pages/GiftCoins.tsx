import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gift, Send, Loader2, Coins, ArrowUpRight, ArrowDownLeft } from "lucide-react";
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

interface GiftRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  receiver_email: string;
  amount: number;
  message: string;
  created_at: string;
}

const GiftCoins = () => {
  const { user } = useAuth();
  const { totalCoins, spendCoins, addCoins } = useGacha();
  const { t } = useI18n();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
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

  const handleSend = async () => {
    if (!user || !email || !amount) return;
    const coinAmount = parseInt(amount);
    if (isNaN(coinAmount) || coinAmount < 1) {
      toast({ title: "Error", description: "Jumlah koin tidak valid", variant: "destructive" });
      return;
    }
    if (coinAmount > totalCoins) {
      toast({ title: "Koin tidak cukup", description: `Koin kamu hanya ${totalCoins.toLocaleString()}`, variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-gift-coins", {
        body: { receiver_email: email, amount: coinAmount, message },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Gagal mengirim gift");
      }

      spendCoins(coinAmount);
      toast({ title: "Gift Terkirim! 🎉", description: `${coinAmount.toLocaleString()} koin berhasil dikirim ke ${email}` });

      // Refresh gift list
      const { data: newGifts } = await supabase
        .from("coin_gifts")
        .select("*")
        .order("created_at", { ascending: false });
      setGifts((newGifts as unknown as GiftRecord[]) || []);

      setEmail("");
      setAmount("");
      setMessage("");
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

        {/* Send form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md space-y-4">
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
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Jumlah Koin</label>
                <Input
                  type="number"
                  placeholder="100"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-secondary"
                />
              </div>
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
              <Button
                className="w-full"
                onClick={handleSend}
                disabled={sending || !email || !amount}
              >
                {sending ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Mengirim...</span>
                ) : (
                  <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Kirim Gift</span>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Gift History */}
        <div className="mx-auto mt-10 max-w-md">
          <h2 className="mb-4 font-display text-lg font-bold text-foreground">Riwayat Gift</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : gifts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Belum ada riwayat gift</p>
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
                          <p className="text-sm font-medium text-foreground">
                            {isSent ? `Kirim ke ${g.receiver_email}` : "Koin diterima"}
                          </p>
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
        </div>
      </main>
    </div>
  );
};

export default GiftCoins;
