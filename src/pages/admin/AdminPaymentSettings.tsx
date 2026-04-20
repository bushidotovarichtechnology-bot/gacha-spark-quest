import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, AlertTriangle, CheckCircle2 } from "lucide-react";

type Mode = "sandbox" | "production";

const AdminPaymentSettings = () => {
  const [mode, setMode] = useState<Mode>("sandbox");
  const [initialMode, setInitialMode] = useState<Mode>("sandbox");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "midtrans_mode")
        .maybeSingle();
      if (error) {
        toast.error("Gagal memuat pengaturan");
      }
      const current = ((data?.value as { mode?: string } | null)?.mode === "production"
        ? "production"
        : "sandbox") as Mode;
      setMode(current);
      setInitialMode(current);
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("key", "midtrans_mode")
      .maybeSingle();

    const payload = { key: "midtrans_mode", value: { mode } };
    const { error } = existing
      ? await supabase.from("app_settings").update(payload).eq("id", existing.id)
      : await supabase.from("app_settings").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return;
    }
    setInitialMode(mode);
    toast.success(`Mode Midtrans diubah ke ${mode.toUpperCase()}`);
  };

  const dirty = mode !== initialMode;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Pengaturan Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          Kelola mode Midtrans antara sandbox (testing) dan production (live).
        </p>
      </div>

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

        {loading ? (
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        ) : (
          <>
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

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setMode(initialMode)}
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
      </Card>
    </div>
  );
};

export default AdminPaymentSettings;
