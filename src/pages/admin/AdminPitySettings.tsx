import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Star, Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";

interface PitySetting {
  id: string;
  campaign_id: string;
  threshold: number;
  guaranteed_tier: string;
  is_enabled: boolean;
}

interface Campaign {
  id: string;
  title: string;
}

const TIERS = ["S", "A", "B"];

const AdminPitySettings = () => {
  const [settings, setSettings] = useState<PitySetting[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchData = async () => {
    const [settingsRes, campaignsRes] = await Promise.all([
      supabase.from("pity_settings").select("*").order("created_at", { ascending: false }),
      supabase.from("campaigns").select("id, title").order("title"),
    ]);
    if (settingsRes.data) setSettings(settingsRes.data as PitySetting[]);
    if (campaignsRes.data) setCampaigns(campaignsRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const campaignsWithoutPity = campaigns.filter(
    (c) => !settings.some((s) => s.campaign_id === c.id)
  );

  const handleAdd = async (campaignId: string) => {
    const { data, error } = await supabase
      .from("pity_settings")
      .insert({ campaign_id: campaignId, threshold: 10, guaranteed_tier: "A", is_enabled: true } as any)
      .select()
      .single();
    if (error) {
      toast.error("Gagal menambahkan pengaturan pity");
    } else if (data) {
      setSettings((prev) => [data as PitySetting, ...prev]);
      toast.success("Pengaturan pity ditambahkan");
    }
  };

  const handleUpdate = async (setting: PitySetting) => {
    setSaving(setting.id);
    const { error } = await supabase
      .from("pity_settings")
      .update({
        threshold: setting.threshold,
        guaranteed_tier: setting.guaranteed_tier,
        is_enabled: setting.is_enabled,
      } as any)
      .eq("id", setting.id);
    setSaving(null);
    if (error) {
      toast.error("Gagal menyimpan");
    } else {
      toast.success("Tersimpan");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("pity_settings").delete().eq("id", id);
    if (error) {
      toast.error("Gagal menghapus");
    } else {
      setSettings((prev) => prev.filter((s) => s.id !== id));
      toast.success("Pengaturan pity dihapus");
    }
  };

  const updateField = (id: string, field: keyof PitySetting, value: any) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const getCampaignTitle = (id: string) =>
    campaigns.find((c) => c.id === id)?.title || id;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Pity System Settings</h1>
        <p className="text-sm text-muted-foreground">
          Atur jaminan hadiah langka setelah sejumlah draw tertentu per campaign
        </p>
      </div>

      {/* Add new */}
      {campaignsWithoutPity.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <Select onValueChange={(v) => handleAdd(v)}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Tambah pity untuk campaign..." />
            </SelectTrigger>
            <SelectContent>
              {campaignsWithoutPity.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {settings.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center rounded-xl border border-border bg-card">
          <Star className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Belum ada pengaturan pity</p>
          <p className="text-xs text-muted-foreground">Pilih campaign di atas untuk menambahkan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map((setting) => (
            <div
              key={setting.id}
              className={`rounded-xl border p-5 transition-colors ${
                setting.is_enabled
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">
                    {getCampaignTitle(setting.campaign_id)}
                  </h3>
                  <p className="text-xs text-muted-foreground">ID: {setting.campaign_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {setting.is_enabled ? "Aktif" : "Nonaktif"}
                  </span>
                  <Switch
                    checked={setting.is_enabled}
                    onCheckedChange={(v) => updateField(setting.id, "is_enabled", v)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Threshold (jumlah draw)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={setting.threshold}
                    onChange={(e) => updateField(setting.id, "threshold", parseInt(e.target.value) || 1)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Setelah {setting.threshold} draw tanpa tier langka, pity aktif
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Tier yang Dijamin
                  </label>
                  <Select
                    value={setting.guaranteed_tier}
                    onValueChange={(v) => updateField(setting.id, "guaranteed_tier", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          Tier {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    User dijamin mendapat tier {setting.guaranteed_tier} atau lebih tinggi
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <ConfirmDelete onConfirm={() => handleDelete(setting.id)}>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5">
                    <Trash2 className="h-4 w-4" /> Hapus
                  </Button>
                </ConfirmDelete>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleUpdate(setting)}
                  disabled={saving === setting.id}
                >
                  {saving === setting.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPitySettings;
