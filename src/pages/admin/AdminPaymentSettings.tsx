import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, AlertTriangle, CheckCircle2, Wallet } from "lucide-react";

type Mode = "sandbox" | "production";

const AdminPaymentSettings = () => {
  const [violetMode, setVioletMode] = useState<Mode>("sandbox");
  const [initialVioletMode, setInitialVioletMode] = useState<Mode>("sandbox");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      setInitialVioletMode(violetMode);
      toast.success("Pengaturan pembayaran disimpan");
    } catch (e: any) {
      console.error("Save payment settings error:", e);
      toast.error("Gagal menyimpan: " + (e?.message || "unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const dirty = violetMode !== initialVioletMode;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Pengaturan Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          Gateway aktif: <strong>Violet Media Pay</strong> (violetmediapay.com). Kelola mode operasi di bawah.
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
                    Pastikan <code>VIOLETMEDIAPAY_API_KEY_PRODUCTION</code>,{" "}
                    <code>VIOLETMEDIAPAY_MERCHANT_ID_PRODUCTION</code>, dan{" "}
                    <code>VIOLETMEDIAPAY_WEBHOOK_SECRET</code> sudah valid.
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
                    <code>VIOLETMEDIAPAY_MERCHANT_ID_SANDBOX</code>.
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Webhook / Notify URL untuk dashboard Violet Media Pay:</p>
              <code className="block break-all bg-background border border-border rounded px-2 py-1">
                {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/violet-webhook`}
              </code>
              <p className="mt-2">
                Tempelkan URL ini ke setting <strong>Notification URL / Callback URL</strong> di dashboard
                violetmediapay.com. Signature dicek dengan <code>VIOLETMEDIAPAY_WEBHOOK_SECRET</code>.
              </p>
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
