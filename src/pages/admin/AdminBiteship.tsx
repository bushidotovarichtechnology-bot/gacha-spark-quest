import { useEffect, useState } from "react";
import { Truck, Save, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BiteshipOrigin {
  contact_name: string;
  contact_phone: string;
  address: string;
  postal_code: string;
  area_id: string;
  note: string;
}

const DEFAULT: BiteshipOrigin = {
  contact_name: "",
  contact_phone: "",
  address: "",
  postal_code: "",
  area_id: "",
  note: "",
};

const AdminBiteship = () => {
  const [form, setForm] = useState<BiteshipOrigin>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "biteship_origin")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setForm({ ...DEFAULT, ...(data.value as any) });
        setLoading(false);
      });
  }, []);

  const update = (k: keyof BiteshipOrigin, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "biteship_origin", value: form as any }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error("Gagal menyimpan", { description: error.message });
    else toast.success("Pengaturan Biteship tersimpan");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center gap-2">
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="font-display text-2xl font-bold tracking-wider">Biteship Settings</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Konfigurasi alamat asal pengiriman (origin gudang). Data ini digunakan untuk integrasi
          tracking & rate kurir via Biteship.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nama Kontak Pengirim</Label>
            <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} placeholder="PT Bushido Gacha" />
          </div>
          <div className="space-y-2">
            <Label>No. Telepon</Label>
            <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="08xxxxxxxxxx" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Alamat Lengkap Gudang</Label>
          <Textarea value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Jl. ..." rows={3} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Kode Pos</Label>
            <Input value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} placeholder="12345" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Area ID Biteship
              <a href="https://biteship.com/id/docs/api/maps/retrieve_areas" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                cari area_id <ExternalLink className="h-3 w-3" />
              </a>
            </Label>
            <Input value={form.area_id} onChange={(e) => update("area_id", e.target.value)} placeholder="IDNP6IDNC150IDND874IDZ12950" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Catatan Pengirim (opsional)</Label>
          <Input value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="Hub Jakarta Pusat" />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Status API Key</p>
          <p>BITESHIP_API_KEY telah dikonfigurasi sebagai secret. Production mode aktif.</p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
};

export default AdminBiteship;
