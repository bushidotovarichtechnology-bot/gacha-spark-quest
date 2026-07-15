import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreditCard, AlertTriangle, CheckCircle2, Wallet, Link2, KeyRound, Copy } from "lucide-react";

type Mode = "sandbox" | "production";

const DEFAULT_SANDBOX_BASE = "https://violetmediapay.com/api/sanbox";
const DEFAULT_PRODUCTION_BASE = "https://violetmediapay.com/api/live";

const AdminPaymentSettings = () => {
  const [violetMode, setVioletMode] = useState<Mode>("sandbox");
  const [initialVioletMode, setInitialVioletMode] = useState<Mode>("sandbox");

  const [sandboxBase, setSandboxBase] = useState("");
  const [productionBase, setProductionBase] = useState("");
  const [initialSandboxBase, setInitialSandboxBase] = useState("");
  const [initialProductionBase, setInitialProductionBase] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/violet-webhook`;

  useEffect(() => {
    (async () => {
      const { data: provRow } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "payment_provider")
        .maybeSingle();
      const provVal = (provRow?.value as { violet_mode?: string } | null) || {};
      const currentMode: Mode = provVal.violet_mode === "production" ? "production" : "sandbox";
      setVioletMode(currentMode);
      setInitialVioletMode(currentMode);

      const { data: epRow } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "violet_endpoints")
        .maybeSingle();
      const ep = (epRow?.value as { sandbox_base_url?: string; production_base_url?: string } | null) || {};
      const sb = ep.sandbox_base_url ?? "";
      const pb = ep.production_base_url ?? "";
      setSandboxBase(sb);
      setProductionBase(pb);
      setInitialSandboxBase(sb);
      setInitialProductionBase(pb);

      setLoading(false);
    })();
  }, []);

  const upsertSetting = async (key: string, value: Record<string, unknown>) => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id ?? null;
    const { data: existing } = await supabase
      .from("app_settings").select("id").eq("key", key).maybeSingle();
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
      await upsertSetting("payment_provider", { active: "violet", violet_mode: violetMode });
      await upsertSetting("violet_endpoints", {
        sandbox_base_url: sandboxBase.trim(),
        production_base_url: productionBase.trim(),
      });
      setInitialVioletMode(violetMode);
      setInitialSandboxBase(sandboxBase);
      setInitialProductionBase(productionBase);
      toast.success("Pengaturan pembayaran disimpan");
    } catch (e: any) {
      console.error("Save payment settings error:", e);
      toast.error("Gagal menyimpan: " + (e?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL disalin");
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  const dirty =
    violetMode !== initialVioletMode ||
    sandboxBase !== initialSandboxBase ||
    productionBase !== initialProductionBase;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Pengaturan Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          Gateway aktif: <strong>Violet Media Pay</strong> (violetmediapay.com). Kelola mode operasi, endpoint, dan webhook di bawah.
        </p>
      </div>

      {loading ? (
        <Card className="p-6"><div className="h-32 animate-pulse rounded-lg bg-muted" /></Card>
      ) : (
        <>
          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold">Payment Gateway Aktif</h2>
                <p className="text-sm text-muted-foreground">
                  Semua transaksi top-up koin & ongkir hadiah diproses melalui Violet Media Pay.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
              <Wallet className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Violet Media Pay</p>
                <p className="text-xs text-muted-foreground">
                  Gateway pembayaran terintegrasi. Metode pembayaran (QRIS, VA, e-wallet, kartu kredit) mengikuti
                  konfigurasi di dashboard merchant violetmediapay.com.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div className="flex items-start gap-3">
              <Wallet className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold">Mode Violet Media Pay</h2>
                <p className="text-sm text-muted-foreground">
                  Beralih antara environment sandbox dan production. Edge function otomatis menggunakan kredensial
                  yang sesuai.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <Label className="text-base">
                  {violetMode === "production" ? "Production (Live)" : "Sandbox (Testing)"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {violetMode === "production"
                    ? "Pembayaran diproses dengan uang asli via api.violetmediapay.com."
                    : "Pembayaran simulasi via sandbox.violetmediapay.com — tidak ada transaksi nyata."}
                </p>
              </div>
              <Switch
                checked={violetMode === "production"}
                onCheckedChange={(checked) => setVioletMode(checked ? "production" : "sandbox")}
              />
            </div>

            {violetMode === "production" ? (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Mode Production aktif</p>
                  <p className="text-muted-foreground text-xs">
                    Pastikan <code>VIOLETMEDIAPAY_API_KEY_PRODUCTION</code> dan{" "}
                    <code>VIOLETMEDIAPAY_SECRET_KEY_PRODUCTION</code> sudah valid.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Mode Sandbox aktif</p>
                  <p className="text-muted-foreground text-xs">
                    Menggunakan <code>VIOLETMEDIAPAY_API_KEY_SANDBOX</code> dan{" "}
                    <code>VIOLETMEDIAPAY_SECRET_KEY_SANDBOX</code>.
                  </p>
                </div>
              </div>
            )}
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Link2 className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold">Endpoint API</h2>
                <p className="text-sm text-muted-foreground">
                  Kosongkan untuk memakai endpoint bawaan. Isi hanya jika Violet Media Pay memberi base URL berbeda
                  (mis. staging khusus merchant).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Sandbox base URL</Label>
              <Input
                placeholder={DEFAULT_SANDBOX_BASE}
                value={sandboxBase}
                onChange={(e) => setSandboxBase(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Default: <code>{DEFAULT_SANDBOX_BASE}</code></p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Production base URL</Label>
              <Input
                placeholder={DEFAULT_PRODUCTION_BASE}
                value={productionBase}
                onChange={(e) => setProductionBase(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Default: <code>{DEFAULT_PRODUCTION_BASE}</code></p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <KeyRound className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h2 className="font-semibold">Webhook / Notify URL</h2>
                <p className="text-sm text-muted-foreground">
                  Tempelkan URL berikut pada kolom <strong>Notification URL / Callback URL</strong> di dashboard
                  violetmediapay.com. Signature diverifikasi menggunakan <code>VIOLETMEDIAPAY_WEBHOOK_SECRET</code>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded border border-border bg-background px-2 py-1.5 text-xs">
                {webhookUrl}
              </code>
              <Button type="button" size="sm" variant="outline" onClick={copyWebhook}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Salin
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <p><strong>Kredensial yang dibutuhkan (disimpan sebagai secret):</strong></p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><code>VIOLETMEDIAPAY_API_KEY_SANDBOX</code> / <code>_PRODUCTION</code></li>
                <li><code>VIOLETMEDIAPAY_MERCHANT_ID_SANDBOX</code> / <code>_PRODUCTION</code></li>
                <li><code>VIOLETMEDIAPAY_WEBHOOK_SECRET</code></li>
              </ul>
            </div>
          </Card>

          <div className="flex justify-end">
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
