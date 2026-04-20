import { format } from "date-fns";
import { CalendarIcon, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PackageFormState, formatRupiah } from "./types";

interface Props {
  form: PackageFormState;
  setForm: (f: PackageFormState) => void;
}

export const PromoSection = ({ form, setForm }: Props) => (
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
);
