import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Plus, Pencil, Trash2, Coins, Zap, Sparkles, Crown, Loader2, CalendarIcon, Percent, Gift, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  discount_percent: number;
  discount_start: string | null;
  discount_end: string | null;
  bonus_coins: number;
  bonus_label: string;
};

const emptyForm = {
  name: "",
  coins: 100,
  price: 15000,
  icon: "Coins",
  is_popular: false,
  is_active: true,
  discount_percent: 0,
  discount_start: null as string | null,
  discount_end: null as string | null,
  bonus_coins: 0,
  bonus_label: "",
};

const formatRupiah = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(v);

const getIcon = (name: string) => ICON_OPTIONS.find((i) => i.value === name)?.icon || Coins;

const isPromoActive = (pkg: CoinPackage) => {
  if (!pkg.discount_percent) return false;
  const now = new Date();
  if (pkg.discount_start && new Date(pkg.discount_start) > now) return false;
  if (pkg.discount_end && new Date(pkg.discount_end) < now) return false;
  return true;
};

interface SortableRowProps {
  pkg: CoinPackage;
  index: number;
  onEdit: (pkg: CoinPackage) => void;
  onDelete: (id: string) => void;
}

const SortableRow = ({ pkg, index, onEdit, onDelete }: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pkg.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const Icon = getIcon(pkg.icon);
  const promoActive = isPromoActive(pkg);

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-border/50 last:border-0 bg-card">
      <td className="px-2 py-3 w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </td>
      <td className="px-3 py-3 font-mono text-muted-foreground w-12">{index + 1}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {pkg.name}
        </div>
      </td>
      <td className="px-3 py-3">{pkg.coins.toLocaleString()}</td>
      <td className="px-3 py-3">
        {promoActive ? (
          <div>
            <span className="text-muted-foreground line-through text-xs">{formatRupiah(pkg.price)}</span>
            <br />
            <span className="text-primary font-medium">
              {formatRupiah(Math.round(pkg.price * (1 - pkg.discount_percent / 100)))}
            </span>
          </div>
        ) : formatRupiah(pkg.price)}
      </td>
      <td className="px-3 py-3">
        {pkg.discount_percent > 0 ? (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", promoActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
            {pkg.discount_percent}% {promoActive ? "🔥" : "(expired)"}
          </span>
        ) : "—"}
      </td>
      <td className="px-3 py-3">
        {pkg.bonus_coins > 0 ? (
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
            +{pkg.bonus_coins} {pkg.bonus_label && `(${pkg.bonus_label})`}
          </span>
        ) : "—"}
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-1">
          {pkg.is_popular && <span className="text-xs">⭐</span>}
          {pkg.is_active ? <span className="text-xs text-primary">Aktif</span> : <span className="text-xs text-muted-foreground">Nonaktif</span>}
        </div>
      </td>
      <td className="px-3 py-3 text-right space-x-1">
        <Button variant="ghost" size="icon" onClick={() => onEdit(pkg)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(pkg.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </td>
    </tr>
  );
};

const AdminCoinPackages = () => {
  const { toast } = useToast();
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CoinPackage | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
      discount_percent: pkg.discount_percent,
      discount_start: pkg.discount_start,
      discount_end: pkg.discount_end,
      bonus_coins: pkg.bonus_coins,
      bonus_label: pkg.bonus_label,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("coin_packages").update(form).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Paket berhasil diperbarui" });
      } else {
        // auto-assign sort_order = max + 1
        const nextOrder = packages.length > 0 ? Math.max(...packages.map(p => p.sort_order)) + 1 : 1;
        const { error } = await supabase.from("coin_packages").insert({ ...form, sort_order: nextOrder });
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
      // Re-normalize sort_order after delete
      const remaining = packages.filter(p => p.id !== id);
      await persistOrder(remaining);
      fetchPackages();
    }
  };

  const persistOrder = async (ordered: CoinPackage[]) => {
    const updates = ordered.map((pkg, idx) =>
      supabase.from("coin_packages").update({ sort_order: idx + 1 }).eq("id", pkg.id)
    );
    await Promise.all(updates);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = packages.findIndex(p => p.id === active.id);
    const newIndex = packages.findIndex(p => p.id === over.id);
    const reordered = arrayMove(packages, oldIndex, newIndex).map((p, idx) => ({ ...p, sort_order: idx + 1 }));

    setPackages(reordered);
    setReordering(true);
    try {
      await persistOrder(reordered);
      toast({ title: "Urutan diperbarui" });
    } catch (err: any) {
      toast({ title: "Gagal menyimpan urutan", description: err.message, variant: "destructive" });
      fetchPackages();
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Coin Packages</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Drag <GripVertical className="inline h-3 w-3" /> untuk mengubah urutan. Penomoran otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reordering && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Tambah Paket
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-2 py-3 w-10"></th>
              <th className="px-3 py-3 text-left font-medium">#</th>
              <th className="px-3 py-3 text-left font-medium">Nama</th>
              <th className="px-3 py-3 text-left font-medium">Koin</th>
              <th className="px-3 py-3 text-left font-medium">Harga</th>
              <th className="px-3 py-3 text-left font-medium">Diskon</th>
              <th className="px-3 py-3 text-left font-medium">Bonus</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
              <th className="px-3 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={packages.map(p => p.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {packages.map((pkg, idx) => (
                  <SortableRow key={pkg.id} pkg={pkg} index={idx} onEdit={openEdit} onDelete={handleDelete} />
                ))}
                {packages.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Belum ada paket</td></tr>
                )}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Paket" : "Tambah Paket"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic info */}
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
              <p className="text-xs text-muted-foreground mt-1">
                Urutan diatur otomatis. Gunakan drag &amp; drop di tabel untuk mengubah posisi.
              </p>
            </div>

            {/* Promo / Discount */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Percent className="h-4 w-4 text-primary" />
                Promo / Diskon
              </div>
              <div>
                <Label>Diskon (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.discount_percent}
                  onChange={(e) => setForm({ ...form, discount_percent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Mulai Promo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.discount_start && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.discount_start ? format(new Date(form.discount_start), "dd MMM yyyy") : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.discount_start ? new Date(form.discount_start) : undefined}
                        onSelect={(d) => setForm({ ...form, discount_start: d ? d.toISOString() : null })}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Akhir Promo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.discount_end && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.discount_end ? format(new Date(form.discount_end), "dd MMM yyyy") : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={form.discount_end ? new Date(form.discount_end) : undefined}
                        onSelect={(d) => setForm({ ...form, discount_end: d ? d.toISOString() : null })}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {form.discount_percent > 0 && (
                <p className="text-xs text-muted-foreground">
                  Harga setelah diskon: <span className="font-medium text-primary">{formatRupiah(Math.round(form.price * (1 - form.discount_percent / 100)))}</span>
                </p>
              )}
            </div>

            {/* Bonus Coins */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Gift className="h-4 w-4 text-accent" />
                Bonus Koin
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Bonus Koin</Label>
                  <Input type="number" min={0} value={form.bonus_coins} onChange={(e) => setForm({ ...form, bonus_coins: Math.max(0, Number(e.target.value)) })} />
                </div>
                <div>
                  <Label>Label Bonus</Label>
                  <Input placeholder="cth: First Purchase" value={form.bonus_label} onChange={(e) => setForm({ ...form, bonus_label: e.target.value })} />
                </div>
              </div>
              {form.bonus_coins > 0 && (
                <p className="text-xs text-muted-foreground">
                  Total koin yang didapat: <span className="font-medium text-accent">{(form.coins + form.bonus_coins).toLocaleString()}</span>
                </p>
              )}
            </div>

            {/* Toggles */}
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
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Simpan Perubahan" : "Tambah Paket"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoinPackages;
