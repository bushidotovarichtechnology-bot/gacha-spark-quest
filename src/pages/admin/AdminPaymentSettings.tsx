import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { CreditCard, AlertTriangle, CheckCircle2, Zap, Wallet } from "lucide-react";

type Mode = "sandbox" | "production";
type Provider = "midtrans" | "stripe" | "ipaymu" | "doku";

const AdminPaymentSettings = () => {
  const [mode, setMode] = useState<Mode>("sandbox");
  const [initialMode, setInitialMode] = useState<Mode>("sandbox");
  const [provider, setProvider] = useState<Provider>("midtrans");
  const [initialProvider, setInitialProvider] = useState<Provider>("midtrans");
  const [ipaymuMode, setIpaymuMode] = useState<Mode>("sandbox");
  const [initialIpaymuMode, setInitialIpaymuMode] = useState<Mode>("sandbox");
  const [dokuMode, setDokuMode] = useState<Mode>("sandbox");
  const [initialDokuMode, setInitialDokuMode] = useState<Mode>("sandbox");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: modeRow }, { data: provRow }] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "midtrans_mode").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "payment_provider").maybeSingle(),
      ]);
      const currentMode = ((modeRow?.value as { mode?: string } | null)?.mode === "production"
        ? "production"
        : "sandbox") as Mode;
      const provVal = (provRow?.value as { provider?: string; active?: string; ipaymu_mode?: string; doku_mode?: string } | null) || {};
      const activeRaw = provVal.active || provVal.provider;
      const currentProv: Provider =
        activeRaw === "stripe" ? "stripe" :
        activeRaw === "ipaymu" ? "ipaymu" :
        activeRaw === "doku" ? "doku" : "midtrans";
      const currentIpaymu: Mode = provVal.ipaymu_mode === "production" ? "production" : "sandbox";
      const currentDoku: Mode = provVal.doku_mode === "production" ? "production" : "sandbox";

      setMode(currentMode);
      setInitialMode(currentMode);
      setProvider(currentProv);
      setInitialProvider(currentProv);
      setIpaymuMode(currentIpaymu);
      setInitialIpaymuMode(currentIpaymu);
      setDokuMode(currentDoku);
      setInitialDokuMode(currentDoku);
      setLoading(false);
    })();
  }, []);

  const upsertSetting = async (key: string, value: Record<string, unknown>) => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id ?? null;
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: value as any, updated_at: new Date().toISOString(), updated_by: uid })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("app_settings")
        .insert([{ key, value: value as any, updated_by: uid }]);
      if (error) throw error;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (provider !== initialProvider || ipaymuMode !== initialIpaymuMode || dokuMode !== initialDokuMode) {
        await upsertSetting("payment_provider", { active: provider, ipaymu_mode: ipaymuMode, doku_mode: dokuMode });
      }
      if (mode !== initialMode) {
        await upsertSetting("midtrans_mode", { mode });
      }
      setInitialMode(mode);
      setInitialProvider(provider);
      setInitialIpaymuMode(ipaymuMode);
      setInitialDokuMode(dokuMode);
      toast.success("Pengaturan pembayaran disimpan");
    } catch (e: any) {
      console.error("Save payment settings error:", e);
      toast.error("Gagal menyimpan: " + (e?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const dirty = mode !== initialMode || provider !== initialProvider || ipaymuMode !== initialIpaymuMode || dokuMode !== initialDokuMode;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Pengaturan Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          Pilih payment gateway aktif (Midtrans / Stripe / iPaymu) dan kelola modenya.
        </p>
      </div>

      {loading ? (
        <Card className="p-6">
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        </Card>
      ) : (
        <>
          {/* Provider Selection */}
          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold">Payment Gateway Aktif</h2>
                <p className="text-sm text-muted-foreground">
                  Pilih gateway yang akan digunakan untuk semua transaksi top-up koin & ongkir hadiah.
                </p>
              </div>
            </div>

            <RadioGroup value={provider} onValueChange={(v) => setProvider(v as Provider)}>
              <label
                htmlFor="prov-midtrans"
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  provider === "midtrans" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value="midtrans" id="prov-midtrans" className="mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">Midtrans</div>
                  <div className="text-xs text-muted-foreground">
                    Gateway lokal Indonesia (GoPay, OVO, DANA, QRIS, VA bank, dll). Wajib aktivasi akun Midtrans.
                  </div>
                </div>
              </label>

              <label
                htmlFor="prov-ipaymu"
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  provider === "ipaymu" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value="ipaymu" id="prov-ipaymu" className="mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">iPaymu (Cadangan)</div>
                  <div className="text-xs text-muted-foreground">
                    Gateway lokal Indonesia (QRIS, VA, e-wallet, retail) dengan halaman bayar iPaymu. Backup jika
                    Midtrans bermasalah.
                  </div>
                </div>
              </label>

              <label
                htmlFor="prov-doku"
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  provider === "doku" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value="doku" id="prov-doku" className="mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">DOKU Checkout (Jokul)</div>
                  <div className="text-xs text-muted-foreground">
                    Halaman bayar DOKU dengan e-wallet (OVO/DANA/ShopeePay/LinkAja), QRIS, VA bank, kartu kredit.
                  </div>
                </div>
              </label>

              <label
                htmlFor="prov-stripe"
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  provider === "stripe" ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value="stripe" id="prov-stripe" className="mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium">Stripe (Bawaan Lovable)</div>
                  <div className="text-xs text-muted-foreground">
                    Backup gateway — kartu kredit/debit internasional. Tidak perlu setup, langsung jalan untuk testing.
                  </div>
                </div>
              </label>
            </RadioGroup>

            {provider === "stripe" && (
              <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Stripe aktif</p>
                  <p className="text-muted-foreground text-xs">
                    Saat ini berjalan di <strong>test mode</strong>. Untuk menerima pembayaran sungguhan, klaim akun
                    Stripe sandbox Anda dari menu Payments di Lovable.
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* iPaymu Mode */}
          {provider === "ipaymu" && (
            <Card className="p-6 space-y-6">
              <div className="flex items-start gap-3">
                <Wallet className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h2 className="font-semibold">Mode iPaymu</h2>
                  <p className="text-sm text-muted-foreground">
                    Beralih antara environment iPaymu. Edge function akan otomatis menggunakan kredensial yang sesuai.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <Label className="text-base">
                    {ipaymuMode === "production" ? "Production (Live)" : "Sandbox (Testing)"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {ipaymuMode === "production"
                      ? "Pembayaran akan diproses dengan uang asli melalui my.ipaymu.com."
                      : "Pembayaran simulasi melalui sandbox.ipaymu.com — tidak ada transaksi nyata."}
                  </p>
                </div>
                <Switch
                  checked={ipaymuMode === "production"}
                  onCheckedChange={(checked) => setIpaymuMode(checked ? "production" : "sandbox")}
                />
              </div>

              {ipaymuMode === "production" ? (
                <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Mode Production aktif</p>
                    <p className="text-muted-foreground text-xs">
                      Pastikan <code>IPAYMU_VA_PRODUCTION</code> dan <code>IPAYMU_API_KEY_PRODUCTION</code> sudah valid
                      dari dashboard my.ipaymu.com.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Mode Sandbox aktif</p>
                    <p className="text-muted-foreground text-xs">
                      Aman untuk testing menggunakan kredensial sandbox.ipaymu.com.
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Webhook URL untuk dashboard iPaymu:</p>
                <code className="block break-all bg-background border border-border rounded px-2 py-1">
                  {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ipaymu-webhook`}
                </code>
                <p className="mt-2">
                  Tempelkan URL ini ke setting <strong>Notify URL / Callback URL</strong> di dashboard iPaymu Anda.
                </p>
              </div>
            </Card>
          )}

          {/* DOKU Mode */}
          {provider === "doku" && (
            <Card className="p-6 space-y-6">
              <div className="flex items-start gap-3">
                <Wallet className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h2 className="font-semibold">Mode DOKU</h2>
                  <p className="text-sm text-muted-foreground">
                    Beralih antara environment DOKU. Edge function akan otomatis menggunakan kredensial yang sesuai.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <Label className="text-base">
                    {dokuMode === "production" ? "Production (Live)" : "Sandbox (Testing)"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {dokuMode === "production"
                      ? "Pembayaran diproses dengan uang asli melalui api.doku.com."
                      : "Pembayaran simulasi melalui api-sandbox.doku.com — tidak ada transaksi nyata."}
                  </p>
                </div>
                <Switch
                  checked={dokuMode === "production"}
                  onCheckedChange={(checked) => setDokuMode(checked ? "production" : "sandbox")}
                />
              </div>

              {dokuMode === "production" ? (
                <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Mode Production aktif</p>
                    <p className="text-muted-foreground text-xs">
                      Pastikan <code>DOKU_CLIENT_ID_PRODUCTION</code> dan <code>DOKU_SECRET_KEY_PRODUCTION</code>
                      sudah valid dari dashboard.doku.com.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Mode Sandbox aktif</p>
                    <p className="text-muted-foreground text-xs">
                      Aman untuk testing menggunakan kredensial sandbox.doku.com.
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Notification URL untuk dashboard DOKU:</p>
                <code className="block break-all bg-background border border-border rounded px-2 py-1">
                  {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/doku-webhook`}
                </code>
                <p className="mt-2">
                  Tempelkan URL ini ke setting <strong>Notification URL</strong> di dashboard DOKU
                  (Settings → Notification). Signature otomatis diverifikasi.
                </p>
              </div>
            </Card>
          )}

          {/* Midtrans Mode */}
          {provider === "midtrans" && (
            <Card className="p-6 space-y-6">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h2 className="font-semibold">Mode Midtrans</h2>
                  <p className="text-sm text-muted-foreground">
                    Beralih antara environment Midtrans. Edge function akan otomatis menggunakan kredensial yang sesuai.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <Label className="text-base">
                    {mode === "production" ? "Production (Live)" : "Sandbox (Testing)"}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {mode === "production"
                      ? "Pembayaran akan diproses dengan uang asli."
                      : "Pembayaran simulasi — tidak ada transaksi nyata."}
                  </p>
                </div>
                <Switch
                  checked={mode === "production"}
                  onCheckedChange={(checked) => setMode(checked ? "production" : "sandbox")}
                />
              </div>

              {mode === "production" ? (
                <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Mode Production aktif</p>
                    <p className="text-muted-foreground text-xs">
                      Pastikan secret <code>MIDTRANS_SERVER_KEY_PRODUCTION</code> dan{" "}
                      <code>MIDTRANS_CLIENT_KEY_PRODUCTION</code> sudah benar.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Mode Sandbox aktif</p>
                    <p className="text-muted-foreground text-xs">
                      Aman untuk testing. Tidak ada uang asli yang diproses.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMode(initialMode);
                setProvider(initialProvider);
                setIpaymuMode(initialIpaymuMode);
                setDokuMode(initialDokuMode);
              }}
              disabled={!dirty || saving}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={!dirty || saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPaymentSettings;
