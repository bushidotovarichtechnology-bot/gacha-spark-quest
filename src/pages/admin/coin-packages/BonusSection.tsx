import { Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PackageFormState } from "./types";

interface Props {
  form: PackageFormState;
  setForm: (f: PackageFormState) => void;
}

export const BonusSection = ({ form, setForm }: Props) => (
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
);
