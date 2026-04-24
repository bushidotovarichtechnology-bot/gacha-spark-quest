import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Mail, User, MessageSquare, FileText } from "lucide-react";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import { useI18n } from "@/context/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import SEO from "@/components/SEO";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
});

const ContactUs = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = t("contactFieldRequired");
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: result.data.name,
      email: result.data.email,
      subject: result.data.subject,
      message: result.data.message,
    });
    setLoading(false);

    if (error) {
      toast({ title: t("contactFailed"), variant: "destructive" });
    } else {
      toast({ title: t("contactSuccess"), description: t("contactSuccessDesc") });
      setForm({ name: "", email: "", subject: "", message: "" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Hubungi Kami — Bushido Gacha"
        description="Hubungi tim Bushido Gacha untuk pertanyaan, masukan, atau kerja sama. Platform gacha online Indonesia oleh PT. BUSHIDO TOVARICH TECHNOLOGY."
        canonicalPath="/contact"
      />
      <Navbar />

      <section className="relative overflow-hidden pt-24 pb-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{t("contactTitle")}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{t("contactSubtitle")}</p>
          </motion.div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container mx-auto px-4">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
            className="mx-auto max-w-lg space-y-5 rounded-2xl border border-border/50 bg-card p-6 md:p-8"
          >
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {t("contactName")}
              </Label>
              <Input
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder={t("contactNamePh")}
                maxLength={100}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@example.com"
                maxLength={255}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                {t("contactSubject")}
              </Label>
              <Input
                value={form.subject}
                onChange={(e) => handleChange("subject", e.target.value)}
                placeholder={t("contactSubjectPh")}
                maxLength={200}
              />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                {t("contactMessage")}
              </Label>
              <Textarea
                value={form.message}
                onChange={(e) => handleChange("message", e.target.value)}
                placeholder={t("contactMessagePh")}
                maxLength={2000}
                rows={5}
              />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <Send className="h-4 w-4" />
              {loading ? t("processing") : t("contactSend")}
            </Button>
          </motion.form>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 text-center">
          <span className="font-display text-sm font-bold tracking-wider text-foreground">
            BUSHIDO<span className="text-accent"> GACHA</span>
          </span>
          <p className="text-xs text-muted-foreground">{t("companyName")}</p>
          <p className="font-display text-xs tracking-wider text-muted-foreground">{t("allRightsReserved")}</p>
        </div>
      </footer>
    </div>
  );
};

export default ContactUs;
