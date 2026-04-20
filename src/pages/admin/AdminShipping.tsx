import { useState, useEffect, useMemo } from "react";
import { Save, Loader2, MapPin, Truck, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ShippingZone } from "@/lib/shippingRates";
import LocationCombobox from "@/components/LocationCombobox";
import { useProvinces } from "@/hooks/use-indonesian-locations";

const AdminShipping = () => {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newProvince, setNewProvince] = useState<Record<string, string>>({});
  const { provinces: allProvinces, loading: provincesLoading } = useProvinces();

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    const { data } = await supabase
      .from("shipping_zones")
      .select("*")
      .order("zone_number");
    setZones((data as ShippingZone[]) || []);
    setLoading(false);
  };

  const updateZone = (id: string, field: string, value: any) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
  };

  const saveZone = async (zone: ShippingZone) => {
    setSaving(zone.id);
    const { error } = await supabase
      .from("shipping_zones")
      .update({
        zone_name: zone.zone_name,
        provinces: zone.provinces,
        regular_price: zone.regular_price,
        regular_eta: zone.regular_eta,
        express_price: zone.express_price,
        express_eta: zone.express_eta,
        same_day_price: zone.same_day_price,
        same_day_eta: zone.same_day_eta,
        same_day_available: zone.same_day_available,
      })
      .eq("id", zone.id);

    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
    } else {
      toast.success(`Zona ${zone.zone_name} berhasil disimpan`);
    }
    setSaving(null);
  };

  const addProvince = (zoneId: string) => {
    const prov = newProvince[zoneId]?.trim();
    if (!prov) return;
    setZones(prev => prev.map(z =>
      z.id === zoneId && !z.provinces.includes(prov)
        ? { ...z, provinces: [...z.provinces, prov] }
        : z
    ));
    setNewProvince(prev => ({ ...prev, [zoneId]: "" }));
  };

  const removeProvince = (zoneId: string, prov: string) => {
    setZones(prev => prev.map(z =>
      z.id === zoneId ? { ...z, provinces: z.provinces.filter(p => p !== prov) } : z
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          Tarif Pengiriman
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Kelola tarif ongkir berdasarkan zona wilayah</p>
      </div>

      <div className="space-y-6">
        {zones.map((zone) => (
          <div key={zone.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                  Z{zone.zone_number}
                </div>
                <div>
                  <Input
                    value={zone.zone_name}
                    onChange={(e) => updateZone(zone.id, "zone_name", e.target.value)}
                    className="h-8 text-sm font-semibold border-none p-0 bg-transparent focus-visible:ring-0"
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => saveZone(zone)}
                disabled={saving === zone.id}
                className="gap-1.5"
              >
                {saving === zone.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Simpan
              </Button>
            </div>

            {/* Provinces */}
            <div className="mb-4">
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                <MapPin className="h-3 w-3" /> Provinsi ({zone.provinces.length})
              </Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {zone.provinces.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                    {p}
                    <button onClick={() => removeProvince(zone.id, p)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <LocationCombobox
                    value={newProvince[zone.id] || ""}
                    onChange={(v) => setNewProvince(prev => ({ ...prev, [zone.id]: v }))}
                    options={allProvinces.filter(p => !zones.some(z => z.provinces.includes(p)))}
                    placeholder="Pilih provinsi untuk ditambah..."
                    searchPlaceholder="Cari provinsi..."
                    emptyText="Semua provinsi sudah digunakan."
                    loading={provincesLoading}
                    className="h-8 text-xs"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => addProvince(zone.id)} className="h-8 gap-1 text-xs" disabled={!newProvince[zone.id]}>
                  <Plus className="h-3 w-3" /> Tambah
                </Button>
              </div>
            </div>

            {/* Rates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Regular */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reguler</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Harga (Rp)</Label>
                  <NumberInput
                    value={zone.regular_price}
                    onValueChange={(val) => updateZone(zone.id, "regular_price", val)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estimasi</Label>
                  <Input
                    value={zone.regular_eta}
                    onChange={(e) => updateZone(zone.id, "regular_eta", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Express */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Express</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Harga (Rp)</Label>
                  <NumberInput
                    value={zone.express_price}
                    onValueChange={(val) => updateZone(zone.id, "express_price", val)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Estimasi</Label>
                  <Input
                    value={zone.express_eta}
                    onChange={(e) => updateZone(zone.id, "express_eta", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Same Day */}
              <div className={`rounded-lg border p-3 space-y-2 ${zone.same_day_available ? "border-accent/30 bg-accent/5" : "border-border"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Same Day</p>
                  <Switch
                    checked={zone.same_day_available}
                    onCheckedChange={(v) => updateZone(zone.id, "same_day_available", v)}
                  />
                </div>
                {zone.same_day_available && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Harga (Rp)</Label>
                      <NumberInput
                        value={zone.same_day_price}
                        onValueChange={(val) => updateZone(zone.id, "same_day_price", val)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Estimasi</Label>
                      <Input
                        value={zone.same_day_eta}
                        onChange={(e) => updateZone(zone.id, "same_day_eta", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminShipping;
