import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Coins, Zap, Sparkles, Crown, Loader2 } from "lucide-react";

const ICON_OPTIONS = [
  { value: "Coins", label: "Coins", icon: Coins },
  { value: "Zap", label: "Zap", icon: Zap },
  { value: "Sparkles", label: "Sparkles", icon: Sparkles },
  { value: "Crown", label: "Crown", icon: Crown },
];

type CoinPackage = {
  id: string;
  name: string;
  coins: number;
  price: number;
  icon: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
};

const emptyForm = {
  name: "",
  coins: 100,
  price: 15000,
  icon: "Coins",
  is_popular: false,
  is_active: true,
  sort_order: 0,
};

const AdminCoinPackages = () => {
  const { toast } = useToast();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CoinPackage | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPackages = async () => {
    const { data } = await supabase
      .from("coin_packages")
      .select("*")
      .order("sort_order");
    setPackages((data as CoinPackage[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPackages(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (pkg: CoinPackage) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      coins: pkg.coins,
      price: pkg.price,
      icon: pkg.icon,
      is_popular: pkg.is_popular,
      is_active: pkg.is_active,
      sort_order: pkg.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("coin_packages")
          .update(form)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Paket berhasil diperbarui" });
      } else {
        const { error } = await supabase
          .from("coin_packages")
          .insert(form);
        if (error) throw error;
        toast({ title: "Paket berhasil ditambahkan" });
      }
      setDialogOpen(false);
      fetchPackages();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus paket ini?")) return;
    const { error } = await supabase.from("coin_packages").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Paket dihapus" });
      fetchPackages();
    }
  };

  const formatRupiah = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

  const getIcon = (name: string) => {
    const found = ICON_OPTIONS.find((i) => i.value === name);
    return found ? found.icon : Coins;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Coin Packages</h1>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-1 h-4 w-4" /> Tambah Paket
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left font-medium">Order</th>
              <th className="px-4 py-3 text-left font-medium">Nama</th>
              <th className="px-4 py-3 text-left font-medium">Koin</th>
              <th className="px-4 py-3 text-left font-medium">Harga</th>
              <th className="px-4 py-3 text-left font-medium">Popular</th>
              <th className="px-4 py-3 text-left font-medium">Aktif</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => {
              const Icon = getIcon(pkg.icon);
              return (
                <tr key={pkg.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">{pkg.sort_order}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {pkg.name}
                  </td>
                  <td className="px-4 py-3">{pkg.coins.toLocaleString()}</td>
                  <td className="px-4 py-3">{formatRupiah(pkg.price)}</td>
                  <td className="px-4 py-3">{pkg.is_popular ? "✅" : "—"}</td>
                  <td className="px-4 py-3">{pkg.is_active ? "✅" : "❌"}</td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(pkg)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {packages.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Belum ada paket</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Paket" : "Tambah Paket"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nama Paket</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jumlah Koin</Label>
                <Input type="number" value={form.coins} onChange={(e) => setForm({ ...form, coins: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Harga (IDR)</Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} />
                Popular
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                Aktif
              </label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Simpan Perubahan" : "Tambah Paket"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoinPackages;
