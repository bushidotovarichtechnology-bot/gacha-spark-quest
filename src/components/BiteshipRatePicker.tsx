import { Loader2, Truck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export interface BiteshipRate {
  courier_code: string;
  courier_name: string;
  courier_service_code: string;
  courier_service_name: string;
  description: string;
  duration: string;
  shipment_duration_range: string;
  shipment_duration_unit: string;
  service_type: string;
  shipping_type: string;
  price: number;
  type: string;
  available_collection_method: string[];
  available_for_cash_on_delivery: boolean;
  available_for_proof_of_delivery: boolean;
  available_for_instant_waybill_id: boolean;
  company: string;
}

interface Props {
  rates: BiteshipRate[];
  loading: boolean;
  selected: string | null; // composite key courier_code:courier_service_code
  onSelect: (rate: BiteshipRate) => void;
  onRefresh: () => void;
  hasArea: boolean;
}

const buildKey = (r: BiteshipRate) => `${r.courier_code}:${r.courier_service_code}`;

const BiteshipRatePicker = ({ rates, loading, selected, onSelect, onRefresh, hasArea }: Props) => {
  if (!hasArea) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center">
        <p className="text-sm text-muted-foreground">Pilih area tujuan dulu untuk melihat opsi pengiriman.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Memuat tarif kurir Biteship...</span>
      </div>
    );
  }

  if (rates.length === 0) {
    return (
      <div className="rounded-xl border border-border p-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">Tidak ada kurir tersedia untuk area ini.</p>
        <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> Muat ulang
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <Truck className="h-4 w-4" /> Pilih Kurir & Layanan
        </Label>
        <button type="button" onClick={onRefresh} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>
      <RadioGroup
        value={selected || ""}
        onValueChange={(v) => {
          const r = rates.find((x) => buildKey(x) === v);
          if (r) onSelect(r);
        }}
        className="space-y-2 max-h-72 overflow-y-auto pr-1"
      >
        {rates.map((r) => {
          const key = buildKey(r);
          const isActive = selected === key;
          return (
            <label
              key={key}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              <RadioGroupItem value={key} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {r.courier_name} <span className="text-muted-foreground font-normal">· {r.courier_service_name}</span>
                </p>
                <p className="text-xs text-muted-foreground truncate">{r.duration} · {r.service_type}</p>
              </div>
              <span className="text-xs font-bold text-accent shrink-0">Rp {r.price.toLocaleString("id-ID")}</span>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
};

export default BiteshipRatePicker;
