import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, MapPin, Truck, ChevronRight, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/context/I18nContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { InventoryItem } from "@/context/GachaContext";

interface ClaimPrizeFormProps {
  item: InventoryItem;
  onClose: () => void;
  onClaimed: (itemId: string) => void;
}

const SHIPPING_METHODS = [
  { id: "regular", labelEn: "Regular (5-7 days)", labelId: "Reguler (5-7 hari)", price: 0 },
  { id: "express", labelEn: "Express (2-3 days)", labelId: "Express (2-3 hari)", price: 15000 },
  { id: "same_day", labelEn: "Same Day", labelId: "Same Day", price: 30000 },
];

const ClaimPrizeForm = ({ item, onClose, onClaimed }: ClaimPrizeFormProps) => {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canProceedStep1 = form.recipientName.trim() && form.phone.trim() && form.address.trim();
  const canProceedStep2 = form.city.trim() && form.province.trim() && form.postalCode.trim();

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("prize_claims").insert({
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
        notes: form.notes.trim(),
      });
      if (error) throw error;
      setSuccess(true);
      toast.success(t("claimSubmitted"), { description: t("claimSubmittedDesc") });
      setTimeout(() => {
        onClaimed(item.id);
        onClose();
      }, 2000);
    } catch (err: any) {
      toast.error(t("claimFailed"), { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedShipping = SHIPPING_METHODS.find((m) => m.id === form.shippingMethod)!;

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <div className="w-full max-w-md rounded-2xl border border-accent/30 bg-card p-8 text-center box-glow-gold">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="font-display text-xl font-bold text-foreground mb-2">{t("claimSubmitted")}</h2>
          <p className="text-sm text-muted-foreground">{t("claimSubmittedDesc")}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-0 sm:p-4"
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card"
      >
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
            item.tier === "S" ? "bg-accent/20 text-accent" :
            item.tier === "A" ? "bg-primary/20 text-primary" :
            "bg-muted text-muted-foreground"
          }`}>{item.tier}</span>
        </div>

        {/* Steps indicator */}
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
              <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipientName">{t("recipientName")}</Label>
                  <Input id="recipientName" value={form.recipientName} onChange={(e) => updateField("recipientName", e.target.value)} placeholder={t("recipientNamePh")} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phoneNumber")}</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="08xxxxxxxxxx" maxLength={20} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t("fullAddress")}</Label>
                  <Textarea id="address" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder={t("fullAddressPh")} maxLength={500} rows={3} />
                </div>
                <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="w-full gap-2">
                  {t("nextStep")} <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="city">{t("city")}</Label>
                  <Input id="city" value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder={t("cityPh")} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">{t("province")}</Label>
                  <Input id="province" value={form.province} onChange={(e) => updateField("province", e.target.value)} placeholder={t("provincePh")} maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">{t("postalCode")}</Label>
                  <Input id="postalCode" value={form.postalCode} onChange={(e) => updateField("postalCode", e.target.value)} placeholder="xxxxx" maxLength={10} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">{t("back")}</Button>
                  <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="flex-1 gap-2">
                    {t("nextStep")} <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Truck className="h-4 w-4" /> {t("shippingMethod")}</Label>
                  <RadioGroup value={form.shippingMethod} onValueChange={(v) => updateField("shippingMethod", v)} className="space-y-2">
                    {SHIPPING_METHODS.map((m) => (
                      <label key={m.id} className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                        form.shippingMethod === m.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}>
                        <RadioGroupItem value={m.id} />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{locale === "id" ? m.labelId : m.labelEn}</p>
                        </div>
                        <span className="text-xs font-bold text-accent">
                          {m.price === 0 ? t("free") : `Rp ${m.price.toLocaleString()}`}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t("claimNotes")}</Label>
                  <Textarea id="notes" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder={t("claimNotesPh")} maxLength={500} rows={2} />
                </div>

                {/* Summary */}
                <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("recipientName")}</span><span className="font-medium text-foreground">{form.recipientName}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("phoneNumber")}</span><span className="font-medium text-foreground">{form.phone}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("city")}</span><span className="font-medium text-foreground">{form.city}, {form.province}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("shippingMethod")}</span><span className="font-medium text-foreground">{locale === "id" ? selectedShipping.labelId : selectedShipping.labelEn}</span></div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">{t("back")}</Button>
                  <Button onClick={handleSubmit} disabled={submitting} className="flex-1 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("processing")}</> : <><Package className="h-4 w-4" /> {t("submitClaim")}</>}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ClaimPrizeForm;
