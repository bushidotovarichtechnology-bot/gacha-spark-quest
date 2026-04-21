import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Wrench, AlertTriangle, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  estimated_time: string;
}

const AdminMaintenance = () => {
  const [config, setConfig] = useState<MaintenanceConfig>({ enabled: false, message: "", estimated_time: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "maintenance_mode")
        .maybeSingle();
      const v = (data?.value as unknown as Partial<MaintenanceConfig> | null) ?? {};
      setConfig({
        enabled: !!v.enabled,
        message: v.message || "",
        estimated_time: v.estimated_time || "",
      });
      setLoading(false);
    };
    fetch();
  }, []);

  const save = async (next: MaintenanceConfig) => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ value: next as unknown as never, updated_at: new Date().toISOString() })
      .eq("key", "maintenance_mode");
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan: " + error.message);
      return false;
    }
    toast.success(next.enabled ? "Maintenance mode AKTIF" : "Maintenance mode dimatikan");
    return true;
  };

  const handleToggle = async (enabled: boolean) => {
    const next = { ...config, enabled };
    setConfig(next);
    await save(next);
  };

  const handleSaveDetails = async () => {
    await save(config);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 font-display text-2xl font-bold tracking-wider">Maintenance Mode</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Saat aktif, semua user (kecuali admin) akan otomatis diarahkan ke halaman maintenance.
      </p>

      {config.enabled && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Maintenance mode sedang AKTIF</p>
            <p className="text-xs mt-1 opacity-90">Pengunjung non-admin tidak bisa mengakses website. Admin tetap bisa login dan mengakses panel.</p>
          </div>
        </div>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-accent" />
            Pengaturan
          </CardTitle>
          <CardDescription>Toggle untuk mengaktifkan / menonaktifkan website sementara.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 p-4">
            <div>
              <Label htmlFor="maintenance-toggle" className="font-display tracking-wider">
                Aktifkan Maintenance
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {config.enabled ? "Website ditutup untuk publik" : "Website normal"}
              </p>
            </div>
            <Switch
              id="maintenance-toggle"
              checked={config.enabled}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Pesan Custom (opsional)</Label>
            <Textarea
              id="message"
              placeholder="Contoh: Kami sedang upgrade sistem reward agar lebih cepat dan stabil."
              value={config.message}
              onChange={(e) => setConfig({ ...config, message: e.target.value })}
              rows={3}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground">{config.message.length}/300 karakter</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eta">Perkiraan Selesai (opsional)</Label>
            <Input
              id="eta"
              placeholder="Contoh: Hari ini pukul 21:00 WIB"
              value={config.estimated_time}
              onChange={(e) => setConfig({ ...config, estimated_time: e.target.value })}
              maxLength={100}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={handleSaveDetails} disabled={saving} variant="neon">
              {saving ? "Menyimpan..." : "Simpan Pesan & ETA"}
            </Button>
            <Button asChild variant="outline">
              <Link to="/" target="_blank">
                <Eye className="h-4 w-4" />
                Lihat sebagai user (incognito)
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 rounded-lg border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-2">Yang masih bisa diakses saat maintenance:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Halaman <code className="text-primary">/admin/*</code> (semua admin)</li>
          <li>Halaman <code className="text-primary">/login</code>, <code className="text-primary">/register</code>, lupa password</li>
          <li>Auto-refresh: perubahan langsung diterapkan tanpa user harus reload</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminMaintenance;
