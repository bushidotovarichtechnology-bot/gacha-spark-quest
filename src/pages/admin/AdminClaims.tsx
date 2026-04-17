import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Truck, Clock, CheckCircle2, Loader2, Eye, X, MapPin, Phone, User, FileText, Save, Hash, ExternalLink, Zap, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Claim {
  id: string;
  user_id: string;
  prize_name: string;
  tier_label: string;
  campaign_id: string;
  image_url: string;
  coin_value: number;
  recipient_name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  shipping_method: string;
  shipping_cost: number;
  shipping_paid: boolean;
  status: string;
  notes: string;
  tracking_number: string | null;
  courier_name: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
  destination_area_id?: string | null;
  courier_company?: string | null;
  courier_service?: string | null;
  shipping_order_id?: string | null;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  { value: "processing", label: "Processing", icon: Loader2, color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  { value: "shipped", label: "Shipped", icon: Truck, color: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  { value: "delivered", label: "Delivered", icon: CheckCircle2, color: "bg-green-500/10 text-green-500 border-green-500/30" },
];

const COURIER_OPTIONS = [
  "JNE", "J&T Express", "SiCepat", "AnterAja", "Ninja Express",
  "POS Indonesia", "TIKI", "GoSend", "GrabExpress", "Lainnya",
];

const SHIPPING_LABELS: Record<string, string> = {
  regular: "Regular",
  express: "Express",
  same_day: "Same Day",
};

const AdminClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Tracking form state
  const [trackingForm, setTrackingForm] = useState({ courier_name: "", tracking_number: "", tracking_url: "" });
  const [savingTracking, setSavingTracking] = useState(false);
  const [creatingBiteship, setCreatingBiteship] = useState(false);
  const [cancellingBiteship, setCancellingBiteship] = useState(false);

  const createBiteshipOrder = async () => {
    if (!selectedClaim) return;
    setCreatingBiteship(true);
    try {
      const { data, error } = await supabase.functions.invoke("biteship-create-order", {
        body: { claim_id: selectedClaim.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Order Biteship dibuat!", {
        description: data.waybill_id ? `AWB: ${data.waybill_id}` : `Order ID: ${data.order_id}`,
      });
      await fetchClaims();
      const { data: refreshed } = await supabase.from("prize_claims").select("*").eq("id", selectedClaim.id).maybeSingle();
      if (refreshed) setSelectedClaim(refreshed as Claim);
    } catch (err: any) {
      toast.error("Gagal membuat order Biteship", { description: err?.message || "Unknown error" });
    } finally {
      setCreatingBiteship(false);
    }
  };

  const cancelBiteshipOrder = async () => {
    if (!selectedClaim) return;
    const reason = window.prompt("Alasan pembatalan order Biteship?", "Cancelled by admin");
    if (reason === null) return;
    if (!window.confirm(`Yakin batalkan order Biteship ${selectedClaim.shipping_order_id}? Status akan kembali ke pending dan AWB dihapus.`)) return;
    setCancellingBiteship(true);
    try {
      const { data, error } = await supabase.functions.invoke("biteship-cancel-order", {
        body: { claim_id: selectedClaim.id, reason },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Order Biteship dibatalkan");
      await fetchClaims();
      const { data: refreshed } = await supabase.from("prize_claims").select("*").eq("id", selectedClaim.id).maybeSingle();
      if (refreshed) setSelectedClaim(refreshed as Claim);
    } catch (err: any) {
      toast.error("Gagal membatalkan order", { description: err?.message || "Unknown error" });
    } finally {
      setCancellingBiteship(false);
    }
  };

  const fetchClaims = async () => {
    const { data, error } = await supabase
      .from("prize_claims")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setClaims(data as Claim[]);
    setLoading(false);
  };

  useEffect(() => { fetchClaims(); }, []);

  // Populate tracking form when selecting a claim
  useEffect(() => {
    if (selectedClaim) {
      setTrackingForm({
        courier_name: selectedClaim.courier_name || "",
        tracking_number: selectedClaim.tracking_number || "",
        tracking_url: selectedClaim.tracking_url || "",
      });
    }
  }, [selectedClaim]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const updateData: Record<string, any> = { status: newStatus };
    if (newStatus === "delivered") updateData.delivered_at = new Date().toISOString();

    const { error } = await supabase.from("prize_claims").update(updateData).eq("id", id);
    if (error) {
      toast.error("Failed to update status", { description: error.message });
    } else {
      setClaims((prev) => prev.map((c) => c.id === id ? { ...c, ...updateData } : c));
      toast.success("Status updated", { description: `Claim set to ${newStatus}` });
      if (selectedClaim?.id === id) setSelectedClaim((prev) => prev ? { ...prev, ...updateData } : null);
    }
    setUpdatingId(null);
  };

  const saveTracking = async () => {
    if (!selectedClaim) return;
    if (!trackingForm.tracking_number.trim()) {
      toast.error("Nomor resi wajib diisi");
      return;
    }
    if (!trackingForm.courier_name.trim()) {
      toast.error("Kurir wajib dipilih");
      return;
    }

    setSavingTracking(true);
    const updateData: Record<string, any> = {
      tracking_number: trackingForm.tracking_number.trim(),
      courier_name: trackingForm.courier_name.trim(),
      tracking_url: trackingForm.tracking_url.trim() || null,
      status: "shipped",
      shipped_at: selectedClaim.shipped_at || new Date().toISOString(),
    };

    const { error } = await supabase.from("prize_claims").update(updateData).eq("id", selectedClaim.id);
    if (error) {
      toast.error("Gagal menyimpan tracking", { description: error.message });
    } else {
      setClaims((prev) => prev.map((c) => c.id === selectedClaim.id ? { ...c, ...updateData } : c));
      setSelectedClaim((prev) => prev ? { ...prev, ...updateData } : null);
      toast.success("Tracking berhasil disimpan!", { description: `Resi: ${trackingForm.tracking_number}` });
    }
    setSavingTracking(false);
  };

  const filtered = filterStatus === "all" ? claims : claims.filter((c) => c.status === filterStatus);
  const statusMeta = (status: string) => STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];

  const statusCounts = {
    all: claims.length,
    pending: claims.filter((c) => c.status === "pending").length,
    processing: claims.filter((c) => c.status === "processing").length,
    shipped: claims.filter((c) => c.status === "shipped").length,
    delivered: claims.filter((c) => c.status === "delivered").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Prize Claims</h1>
          <p className="text-sm text-muted-foreground">{claims.length} total claims</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-5 flex gap-2 flex-wrap">
        {(["all", "pending", "processing", "shipped", "delivered"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
              filterStatus === s
                ? "bg-destructive/10 text-destructive border border-destructive/30"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filterStatus === s ? "bg-destructive/20" : "bg-background/40"}`}>
              {statusCounts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Claims table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Prize</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Recipient</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Shipping</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Resi</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((claim) => {
                const sm = statusMeta(claim.status);
                const StatusIcon = sm.icon;
                return (
                  <tr key={claim.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {claim.image_url ? (
                          <img src={claim.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-foreground">{claim.prize_name}</p>
                          <p className="text-xs text-muted-foreground">Tier {claim.tier_label}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{claim.recipient_name}</p>
                      <p className="text-xs text-muted-foreground">{claim.city}, {claim.province}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground">{SHIPPING_LABELS[claim.shipping_method] || claim.shipping_method}</p>
                      {claim.shipping_cost > 0 && (
                        <p className="text-xs font-medium text-foreground">Rp {claim.shipping_cost.toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {claim.tracking_number ? (
                        <div>
                          <p className="text-xs font-mono font-medium text-foreground">{claim.tracking_number}</p>
                          <p className="text-[10px] text-muted-foreground">{claim.courier_name}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`gap-1 ${sm.color}`}>
                        <StatusIcon className={`h-3 w-3 ${claim.status === "processing" ? "animate-spin" : ""}`} />
                        {sm.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {(() => { try { return formatDistanceToNow(new Date(claim.created_at), { addSuffix: true }); } catch { return claim.created_at; } })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Select value={claim.status} onValueChange={(v) => updateStatus(claim.id, v)} disabled={updatingId === claim.id}>
                          <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedClaim(claim)} className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <Package className="mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No claims found</p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg font-bold text-foreground">Claim Details</h2>
              <button onClick={() => setSelectedClaim(null)} className="rounded-full p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Prize */}
              <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
                {selectedClaim.image_url && <img src={selectedClaim.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
                <div>
                  <p className="font-display font-bold text-foreground">{selectedClaim.prize_name}</p>
                  <p className="text-xs text-muted-foreground">Tier {selectedClaim.tier_label} · Campaign: {selectedClaim.campaign_id}</p>
                </div>
              </div>

              {/* Status update */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Status:</span>
                <Select value={selectedClaim.status} onValueChange={(v) => updateStatus(selectedClaim.id, v)} disabled={updatingId === selectedClaim.id}>
                  <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Biteship auto-create order */}
              <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Buat Order Biteship Otomatis
                </h3>
                <p className="text-xs text-muted-foreground">
                  Generate AWB otomatis dari Biteship pakai data klaim & origin gudang. Status akan jadi <span className="font-semibold">shipped</span>.
                </p>
                {selectedClaim.shipping_order_id ? (
                  <div className="text-xs bg-muted/50 rounded-lg p-2 space-y-1">
                    <p>Order ID: <span className="font-mono font-semibold text-foreground">{selectedClaim.shipping_order_id}</span></p>
                    {selectedClaim.tracking_number && <p>AWB: <span className="font-mono font-semibold text-foreground">{selectedClaim.tracking_number}</span></p>}
                  </div>
                ) : (
                  <Button
                    onClick={createBiteshipOrder}
                    disabled={creatingBiteship || !selectedClaim.destination_area_id || !selectedClaim.courier_company}
                    className="w-full gap-2 h-9"
                    variant="default"
                  >
                    {creatingBiteship ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Buat Order Biteship
                  </Button>
                )}
                {(!selectedClaim.destination_area_id || !selectedClaim.courier_company) && !selectedClaim.shipping_order_id && (
                  <p className="text-[11px] text-destructive">
                    Klaim ini belum punya destination_area_id atau courier dari Biteship. Tidak bisa auto-create — input manual di bawah.
                  </p>
                )}
              </div>

              {/* Tracking input section */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" /> Input Tracking / Resi (Manual)
                </h3>

                <div className="space-y-2">
                  <Label className="text-xs">Kurir</Label>
                  <Select value={trackingForm.courier_name} onValueChange={(v) => setTrackingForm(p => ({ ...p, courier_name: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih kurir..." /></SelectTrigger>
                    <SelectContent>
                      {COURIER_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Nomor Resi</Label>
                  <Input
                    value={trackingForm.tracking_number}
                    onChange={(e) => setTrackingForm(p => ({ ...p, tracking_number: e.target.value }))}
                    placeholder="Masukkan nomor resi..."
                    className="h-9 text-sm font-mono"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Link Tracking (opsional)</Label>
                  <Input
                    value={trackingForm.tracking_url}
                    onChange={(e) => setTrackingForm(p => ({ ...p, tracking_url: e.target.value }))}
                    placeholder="https://..."
                    className="h-9 text-sm"
                    maxLength={500}
                  />
                </div>

                <Button onClick={saveTracking} disabled={savingTracking} className="w-full gap-2 h-9">
                  {savingTracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Resi & Set Shipped
                </Button>

                {selectedClaim.tracking_number && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 space-y-1">
                    <p>Resi aktif: <span className="font-mono font-semibold text-foreground">{selectedClaim.tracking_number}</span></p>
                    <p>Kurir: <span className="font-semibold text-foreground">{selectedClaim.courier_name}</span></p>
                    {selectedClaim.tracking_url && (
                      <a href={selectedClaim.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Buka link tracking
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Recipient info */}
              <div className="space-y-3 rounded-xl border border-border p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipient</h3>
                <div className="flex items-start gap-2"><User className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm text-foreground">{selectedClaim.recipient_name}</span></div>
                <div className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm text-foreground">{selectedClaim.phone}</span></div>
                <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm text-foreground">{selectedClaim.address}, {selectedClaim.city}, {selectedClaim.province} {selectedClaim.postal_code}</span></div>
                <div className="flex items-start gap-2"><Truck className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm text-foreground">{SHIPPING_LABELS[selectedClaim.shipping_method] || selectedClaim.shipping_method}</span></div>
                {selectedClaim.shipping_cost > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Ongkir:</span>
                    <span className="font-semibold">Rp {selectedClaim.shipping_cost.toLocaleString()} {selectedClaim.shipping_paid ? "✅ Lunas" : "⏳ Belum Bayar"}</span>
                  </div>
                )}
                {selectedClaim.notes && (
                  <div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm text-foreground">{selectedClaim.notes}</span></div>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Submitted {(() => { try { return formatDistanceToNow(new Date(selectedClaim.created_at), { addSuffix: true }); } catch { return selectedClaim.created_at; } })()}
                {" · "}User ID: {selectedClaim.user_id.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClaims;
