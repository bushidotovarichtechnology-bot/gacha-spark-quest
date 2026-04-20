import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Ticket, Gift, Coins, Percent, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Coupon {
  id: string;
  code: string;
  description: string;
  benefit_type: string;
  benefit_value: number;
  max_uses: number;
  used_count: number;
  max_uses_per_user: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const BENEFIT_TYPES = [
  { value: "bonus_coins", label: "Bonus Koin", icon: Coins },
  { value: "free_gacha", label: "Gacha Gratis", icon: Gamepad2 },
  { value: "discount_percent", label: "Diskon %", icon: Percent },
];

const emptyForm = {
  code: "",
  description: "",
  benefit_type: "bonus_coins",
  benefit_value: 0,
  max_uses: 0,
  max_uses_per_user: 1,
  is_active: true,
  expires_at: "",
};

const AdminCoupons = () => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    setCoupons((data as unknown as Coupon[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description,
      benefit_type: c.benefit_type,
      benefit_value: c.benefit_value,
      max_uses: c.max_uses,
      max_uses_per_user: c.max_uses_per_user,
      is_active: c.is_active,
      expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast({ title: "Error", description: "Kode kupon wajib diisi", variant: "destructive" }); return; }
    setSaving(true);

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      benefit_type: form.benefit_type,
      benefit_value: form.benefit_value,
      max_uses: form.max_uses,
      max_uses_per_user: form.max_uses_per_user,
      is_active: form.is_active,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("coupons").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("coupons").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: editing ? "Bushido Kupon diperbarui" : "Bushido Kupon dibuat" });
      setDialogOpen(false);
      fetchCoupons();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus Bushido Kupon ini?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    fetchCoupons();
  };

  const benefitLabel = (type: string, value: number) => {
    switch (type) {
      case "bonus_coins": return `+${value.toLocaleString()} Koin`;
      case "free_gacha": return `${value}x Gacha Gratis`;
      case "discount_percent": return `Diskon ${value}%`;
      default: return `${value}`;
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kelola Bushido Kupon</h1>
          <p className="text-sm text-muted-foreground">Buat dan atur Bushido Kupon untuk user</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Buat Bushido Kupon</Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Benefit</TableHead>
              <TableHead>Penggunaan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kedaluwarsa</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Belum ada Bushido Kupon</TableCell></TableRow>
            ) : coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div>
                    <span className="font-mono font-bold text-foreground">{c.code}</span>
                    {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{benefitLabel(c.benefit_type, c.benefit_value)}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{c.used_count}/{c.max_uses || "∞"}</span>
                  <span className="block text-xs text-muted-foreground">max {c.max_uses_per_user}/user</span>
                </TableCell>
                <TableCell>
                  <Badge variant={c.is_active ? "default" : "secondary"}>
                    {c.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString("id-ID") : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Bushido Kupon" : "Buat Bushido Kupon Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kode Bushido Kupon</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="BUSHIDO100" className="font-mono" maxLength={30} />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Bonus koin spesial" maxLength={200} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis Benefit</Label>
                <Select value={form.benefit_type} onValueChange={(v) => setForm({ ...form, benefit_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BENEFIT_TYPES.map((bt) => (
                      <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nilai Benefit</Label>
                <NumberInput min={0} value={form.benefit_value} onValueChange={(val) => setForm({ ...form, benefit_value: val })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Maks Total Penggunaan</Label>
                <NumberInput min={0} value={form.max_uses} onValueChange={(val) => setForm({ ...form, max_uses: val })} />
                <p className="text-xs text-muted-foreground mt-1">0 = unlimited</p>
              </div>
              <div>
                <Label>Maks Per User</Label>
                <NumberInput min={1} value={form.max_uses_per_user} onValueChange={(val) => setForm({ ...form, max_uses_per_user: val })} />
              </div>
            </div>
            <div>
              <Label>Tanggal Kedaluwarsa (opsional)</Label>
              <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Aktif</Label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editing ? "Simpan Perubahan" : "Buat Bushido Kupon"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
