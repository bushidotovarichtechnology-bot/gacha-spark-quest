import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { ICON_OPTIONS, PackageFormState } from "./types";
import { PromoSection } from "./PromoSection";
import { BonusSection } from "./BonusSection";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: boolean;
  form: PackageFormState;
  setForm: (f: PackageFormState) => void;
  saving: boolean;
  onSave: () => void;
}

export const PackageForm = ({ open, onOpenChange, editing, form, setForm, saving, onSave }: Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

        <PromoSection form={form} setForm={setForm} />
        <BonusSection form={form} setForm={setForm} />

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

        <Button className="w-full" onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editing ? "Simpan Perubahan" : "Tambah Paket"}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
