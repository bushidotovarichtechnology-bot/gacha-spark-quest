import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Layers, Loader2 } from "lucide-react";

interface Props {
  campaignIds: string[];
  onDone?: () => void;
}

/**
 * Admin tool to add a single tier (with one optional prize) to ALL campaigns at once.
 * Useful for rolling out a global "D / Common" tier across the catalog.
 */
export function BulkTierPanel({ campaignIds, onDone }: Props) {
  const { toast } = useToast();
  const [label, setLabel] = useState("D");
  const [name, setName] = useState("Common");
  const [total, setTotal] = useState(100);
  const [weight, setWeight] = useState(10);
  const [prizeName, setPrizeName] = useState("");
  const [prizeTotal, setPrizeTotal] = useState(1);
  const [coinValue, setCoinValue] = useState(0);
  const [skipExisting, setSkipExisting] = useState(true);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!name.trim()) { toast({ title: "Tier name wajib diisi", variant: "destructive" }); return; }
    if (campaignIds.length === 0) { toast({ title: "Tidak ada campaign", variant: "destructive" }); return; }
    setBusy(true);
    try {
      // optional skip campaigns that already have this label
      let targets = campaignIds;
      if (skipExisting) {
        const { data: existing } = await supabase
          .from("campaign_tiers")
          .select("campaign_id")
          .eq("label", label)
          .in("campaign_id", campaignIds);
        const has = new Set((existing ?? []).map((r) => r.campaign_id));
        targets = campaignIds.filter((id) => !has.has(id));
      }
      if (targets.length === 0) {
        toast({ title: "Semua campaign sudah memiliki tier ini", description: "Tidak ada perubahan." });
        setBusy(false);
        return;
      }

      // get max sort_order per target campaign so the new tier goes last
      const { data: orderRows } = await supabase
        .from("campaign_tiers")
        .select("campaign_id, sort_order")
        .in("campaign_id", targets);
      const maxOrder = new Map<string, number>();
      (orderRows ?? []).forEach((r) => {
        const cur = maxOrder.get(r.campaign_id) ?? -1;
        if ((r.sort_order ?? 0) > cur) maxOrder.set(r.campaign_id, r.sort_order ?? 0);
      });

      const tierRows = targets.map((cid) => ({
        campaign_id: cid,
        label,
        name: name.trim(),
        total,
        remaining: total,
        probability_weight: weight,
        sort_order: (maxOrder.get(cid) ?? -1) + 1,
      }));

      const { data: inserted, error } = await supabase
        .from("campaign_tiers")
        .insert(tierRows)
        .select("id");
      if (error) throw error;

      if (prizeName.trim() && inserted && inserted.length > 0) {
        const prizeRows = inserted.map((t) => ({
          tier_id: t.id,
          name: prizeName.trim(),
          total: prizeTotal,
          remaining: prizeTotal,
          coin_value: coinValue,
        }));
        const { error: pe } = await supabase.from("tier_prizes").insert(prizeRows);
        if (pe) throw pe;
      }

      toast({ title: "Tier ditambahkan", description: `Berhasil ke ${targets.length} campaign.` });
      onDone?.();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6 border-border/50">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="h-4 w-4" /> Bulk Add Tier ke Semua Campaign
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tambah satu tier (opsional + 1 hadiah) ke seluruh {campaignIds.length} campaign sekaligus.
          Cocok untuk rollout tier <strong>D / Common</strong> ke semua campaign.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Label</label>
            <Select value={label} onValueChange={setLabel}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="S">S — Diamond</SelectItem>
                <SelectItem value="A">A — Gold</SelectItem>
                <SelectItem value="B">B — Silver</SelectItem>
                <SelectItem value="C">C — Bronze</SelectItem>
                <SelectItem value="D">D — Common</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="mb-1 block text-xs text-muted-foreground">Tier Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Common" className="h-9" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Stok</label>
            <NumberInput value={total} onValueChange={setTotal} min={1} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Bobot Probabilitas</label>
            <NumberInput value={weight} onValueChange={setWeight} min={0} />
          </div>
        </div>

        <div className="rounded-md border border-border/50 p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Hadiah default (opsional)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-xs text-muted-foreground">Nama Hadiah</label>
              <Input value={prizeName} onChange={(e) => setPrizeName(e.target.value)} placeholder="cth: 1 Koin" className="h-9" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Stok Hadiah</label>
              <NumberInput value={prizeTotal} onValueChange={setPrizeTotal} min={1} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nilai Koin</label>
              <NumberInput value={coinValue} onValueChange={setCoinValue} min={0} />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={skipExisting} onChange={(e) => setSkipExisting(e.target.checked)} />
          Lewati campaign yang sudah punya tier "{label}"
        </label>

        <Button onClick={run} disabled={busy} className="gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
          Terapkan ke Semua Campaign
        </Button>
      </CardContent>
    </Card>
  );
}
