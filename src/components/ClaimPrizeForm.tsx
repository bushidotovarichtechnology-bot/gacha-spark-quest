import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ChevronRight, X, Loader2, CheckCircle2, CreditCard, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LocationCombobox from "@/components/LocationCombobox";
import { toast } from "sonner";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchShippingZones,
  getProvincesList,
  getAvailableMethodsFromZones,
  type ShippingZone,
} from "@/lib/shippingRates";
import { useCitiesForProvince } from "@/hooks/use-indonesian-locations";
import type { InventoryItem } from "@/context/GachaContext";

interface ClaimPrizeFormProps {
  item: InventoryItem;
  onClose: () => void;
  onClaimed: (itemId: string) => void;
}

declare global {
  interface Window {
    snap: {
      pay: (token: string, options: {
        onSuccess?: (result: any) => void;
        onPending?: (result: any) => void;
        onError?: (result: any) => void;
        onClose?: () => void;
      }) => void;
    };
  }
}

const ClaimPrizeForm = ({ item, onClose, onClaimed }: ClaimPrizeFormProps) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [payingShipping, setPayingShipping] = useState(false);

  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);

  const [form, setForm] = useState({
    recipientName: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    shippingMethod: "regular",
    notes: "",
  });

  useEffect(() => {
    fetchShippingZones().then((z) => { setZones(z); setZonesLoading(false); });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("recipient_name, phone, address, city, province, postal_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm((prev) => ({
            ...prev,
            recipientName: data.recipient_name || prev.recipientName,
            phone: data.phone || prev.phone,
            address: data.address || prev.address,
            city: data.city || prev.city,
            province: data.province || prev.province,
            postalCode: data.postal_code || prev.postalCode,
          }));
        }
      });
  }, [user]);

  const { cities, loading: citiesLoading } = useCitiesForProvince(form.province);

  // Reset city when province change makes it invalid
  useEffect(() => {
    if (!form.province) return;
    if (!citiesLoading && cities.length > 0 && form.city && !cities.includes(form.city)) {
      setForm((prev) => ({ ...prev, city: "" }));
    }
  }, [form.province, cities, citiesLoading, form.city]);

  const updateField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const provinces = useMemo(() => getProvincesList(zones), [zones]);
  const availableMethods = useMemo(
    () => getAvailableMethodsFromZones(zones, form.province),
    [zones, form.province]
  );
  const selectedMethod = availableMethods.find((m) => m.id === form.shippingMethod) || availableMethods[0];
  const shippingCost = selectedMethod?.price || 0;

  const canProceedStep1 = form.recipientName.trim() && form.phone.trim() && form.address.trim();
  const canProceedStep2 = form.city.trim() && form.province.trim() && form.postalCode.trim();

  const handleSubmit = async () => {
    if (!user || !selectedMethod) return;
    setSubmitting(true);
    try {
      const { data: claimData, error } = await supabase.from("prize_claims").insert({
        user_id: user.id,
        prize_name: item.prize,
        tier_label: item.tier,
        campaign_id: item.campaignId,
        image_url: item.image,
        coin_value: item.coinValue,
        recipient_name: form.recipientName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postal_code: form.postalCode.trim(),
        shipping_method: form.shippingMethod,
        shipping_eta: selectedMethod.eta,
        shipping_cost: shippingCost,
        notes: form.notes.trim(),
        payment_status: shippingCost > 0 ? "unpaid" : "not_required",
      }).select("id").single();

      if (error) throw error;

      if (shippingCost > 0 && claimData) {
        setStep(4);
        await handleShippingPayment(claimData.id);
      } else {
        // Free shipping → claim is immediately valid
        setSuccess(true);
        toast.success(t("claimSubmitted"), { description: t("claimSubmittedDesc") });
        setTimeout(() => { onClaimed(item.id); onClose(); }, 2000);
      }
    } catch (err: any) {
      toast.error(t("claimFailed"), { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleShippingPayment = async (claimId: string) => {
    if (!selectedMethod) return;
    setPayingShipping(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-shipping-payment", {
        body: {
          claim_id: claimId,
          shipping_cost: shippingCost,
          shipping_method: selectedMethod.label,
          prize_name: item.prize,
        },
      });

      if (error || !data?.token) throw new Error(error?.message || "Failed to create shipping payment");

      if (data.client_key) {
        const script = document.querySelector('script[src*="midtrans"]') as HTMLScriptElement;
        if (script) script.setAttribute("data-client-key", data.client_key);
      }

      window.snap.pay(data.token, {
        // NOTE: Do NOT mark shipping_paid=true here. Only the Midtrans webhook
        // (with verified signature) is allowed to confirm payment & flip the
        // claim's payment_status to 'paid'. This prevents users from forging
        // a successful claim by manipulating the client.
        onSuccess: () => {
          setSuccess(true);
          toast.success("Pembayaran terkirim!", {
            description: "Klaim akan diproses setelah pembayaran dikonfirmasi sistem.",
          });
          setTimeout(() => { onClaimed(item.id); onClose(); }, 2500);
        },
        onPending: () => {
          toast.info("Pembayaran pending", {
            description: "Selesaikan pembayaran agar klaim diproses.",
          });
          setSuccess(true);
          setTimeout(() => { onClaimed(item.id); onClose(); }, 2500);
        },
        onError: () => {
          toast.error("Pembayaran gagal", { description: "Silakan coba lagi dari Riwayat Klaim." });
          setStep(3);
        },
        onClose: () => {
          toast.info("Pembayaran dibatalkan", {
            description: "Klaim belum aktif sampai ongkir dibayar. Lanjutkan dari Riwayat Klaim.",
          });
          setStep(3);
        },
      });
    } catch (err: any) {
      toast.error("Gagal membuat pembayaran ongkir", { description: err.message });
      setStep(3);
    } finally {
      setPayingShipping(false);
    }
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl border border-accent/30 bg-card p-8 text-center box-glow-gold">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("claimSubmitted")}</h2>
          <p className="text-sm text-muted-foreground">{t("claimSubmittedDesc")}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-0 sm:p-4">
      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 py-3 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold text-foreground">{t("claimPrize")}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Prize summary */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-muted/30">
          <img src={item.image} alt={item.prize} className="h-12 w-12 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-semibold text-foreground truncate">{item.prize}</p>
            <p className="text-xs text-muted-foreground">{item.campaign} · {t(`tier${item.tier}Label`)}</p>
          </div>
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
            item.tier === "S" ? "bg-accent/20 text-accent" : item.tier === "A" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}>{item.tier}</span>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 px-4 py-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{s}</div>
              <span className={`text-xs font-medium hidden sm:inline ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                {s === 1 ? t("stepRecipient") : s === 2 ? t("stepAddress") : t("stepShipping")}
              </span>
              {s < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>

        <div className="px-4 pb-4">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("recipientName")}</Label>
                  <Input value={form.recipientName} onChange={(e) => updateField("recipientName", e.target.value)} placeholder={t("recipientNamePh")} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label>{t("phoneNumber")}</Label>
                  <Input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="08xxxxxxxxxx" maxLength={20} />
                </div>
                <div className="space-y-2">
                  <Label>{t("fullAddress")}</Label>
                  <Textarea value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder={t("fullAddressPh")} maxLength={500} rows={3} />
                </div>
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full gap-2">
                  {t("nextStep")} <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("province")}</Label>
                  <LocationCombobox
                    value={form.province}
                    onChange={(v) => updateField("province", v)}
                    options={provinces}
                    placeholder="Pilih provinsi..."
                    searchPlaceholder="Cari provinsi..."
                    emptyText="Provinsi tidak ditemukan."
                    loading={zonesLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("city")}</Label>
                  <LocationCombobox
                    value={form.city}
                    onChange={(v) => updateField("city", v)}
                    options={cities}
                    placeholder={
                      !form.province
                        ? "Pilih provinsi dulu"
                        : cities.length === 0
                          ? "Tidak ada kota tersedia"
                          : "Pilih kota..."
                    }
                    searchPlaceholder="Cari kota..."
                    emptyText="Kota tidak ditemukan."
                    disabled={!form.province}
                    loading={citiesLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("postalCode")}</Label>
                  <Input value={form.postalCode} onChange={(e) => updateField("postalCode", e.target.value)} placeholder="12345" maxLength={10} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">{t("back")}</Button>
                  <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="flex-1 gap-2">{t("nextStep")} <ChevronRight className="h-4 w-4" /></Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5" /> Pilih Metode Pengiriman</Label>
                  <div className="space-y-2">
                    {availableMethods.map((m) => (
                      <label
                        key={m.id}
                        className={`flex items-center justify-between gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                          form.shippingMethod === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="ship"
                            checked={form.shippingMethod === m.id}
                            onChange={() => updateField("shippingMethod", m.id)}
                            className="accent-primary"
                          />
                          <div>
                            <p className="text-sm font-semibold text-foreground">{m.label}</p>
                            <p className="text-xs text-muted-foreground">{m.eta}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-accent">Rp {m.price.toLocaleString("id-ID")}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Estimasi ongkir berdasarkan jarak dari gudang Surabaya. Resi akan diinput admin setelah paket dikirim.</p>
                </div>

                <div className="space-y-2">
                  <Label>{t("claimNotes")}</Label>
                  <Textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder={t("claimNotesPh")} maxLength={500} rows={2} />
                </div>

                {/* Summary */}
                <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("recipientName")}</span><span className="font-medium text-foreground">{form.recipientName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("province")}</span><span className="font-medium text-foreground">{form.province}</span></div>
                  {selectedMethod && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Metode</span><span className="font-medium text-foreground">{selectedMethod.label} · {selectedMethod.eta}</span></div>
                  )}
                  <div className="border-t border-border pt-1.5 mt-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-semibold">Ongkos Kirim</span>
                      <span className="font-bold text-accent">Rp {shippingCost.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">{t("back")}</Button>
                  <Button onClick={handleSubmit} disabled={submitting || !selectedMethod} className="flex-1 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("processing")}</> : <><CreditCard className="h-4 w-4" /> Bayar Rp {shippingCost.toLocaleString("id-ID")}</>}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center space-y-4">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Memproses pembayaran ongkir...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ClaimPrizeForm;
