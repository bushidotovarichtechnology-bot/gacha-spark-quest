import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Truck, Clock, CheckCircle2, Loader2, Eye, X, MapPin, Phone, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: Clock, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  { value: "processing", label: "Processing", icon: Loader2, color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  { value: "shipped", label: "Shipped", icon: Truck, color: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  { value: "delivered", label: "Delivered", icon: CheckCircle2, color: "bg-green-500/10 text-green-500 border-green-500/30" },
];

const SHIPPING_LABELS: Record<string, string> = {
  regular: "Regular (5-7 days)",
  express: "Express (2-3 days)",
  same_day: "Same Day",
};

const AdminClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchClaims = async () => {
    const { data, error } = await supabase
      .from("prize_claims")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setClaims(data as Claim[]);
    setLoading(false);
  };

  useEffect(() => { fetchClaims(); }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    const { error } = await supabase
      .from("prize_claims")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update status", { description: error.message });
    } else {
      setClaims((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c));
      toast.success("Status updated", { description: `Claim set to ${newStatus}` });
      if (selectedClaim?.id === id) setSelectedClaim((prev) => prev ? { ...prev, status: newStatus } : null);
    }
    setUpdatingId(null);
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
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {SHIPPING_LABELS[claim.shipping_method] || claim.shipping_method}
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
                        <Select
                          value={claim.status}
                          onValueChange={(v) => updateStatus(claim.id, v)}
                          disabled={updatingId === claim.id}
                        >
                          <SelectTrigger className="h-8 w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.label}
                              </SelectItem>
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

              {/* Recipient info */}
              <div className="space-y-3 rounded-xl border border-border p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipient</h3>
                <div className="flex items-start gap-2"><User className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm text-foreground">{selectedClaim.recipient_name}</span></div>
                <div className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm text-foreground">{selectedClaim.phone}</span></div>
                <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm text-foreground">{selectedClaim.address}, {selectedClaim.city}, {selectedClaim.province} {selectedClaim.postal_code}</span></div>
                <div className="flex items-start gap-2"><Truck className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" /><span className="text-sm text-foreground">{SHIPPING_LABELS[selectedClaim.shipping_method] || selectedClaim.shipping_method}</span></div>
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
