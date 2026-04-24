import { motion } from "framer-motion";
import { Shield, Target, Users, Sparkles, Globe, Swords } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { organizationLd } from "@/lib/structuredData";
import { useI18n } from "@/context/I18nContext";
import { Link } from "react-router-dom";

const AboutUs = () => {
  const { t } = useI18n();

  const values = [
    { icon: Shield, titleKey: "aboutValueFairTitle" as const, descKey: "aboutValueFairDesc" as const },
    { icon: Sparkles, titleKey: "aboutValueInnovationTitle" as const, descKey: "aboutValueInnovationDesc" as const },
    { icon: Users, titleKey: "aboutValueCommunityTitle" as const, descKey: "aboutValueCommunityDesc" as const },
    { icon: Globe, titleKey: "aboutValueTransparencyTitle" as const, descKey: "aboutValueTransparencyDesc" as const },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Tentang PT. BUSHIDO TOVARICH TECHNOLOGY — Bushido Gacha"
        description="PT. BUSHIDO TOVARICH TECHNOLOGY membangun Bushido Gacha — platform gacha online Indonesia dengan fokus Fair Play, Transparansi, dan Komunitas."
        canonicalPath="/about"
        jsonLd={organizationLd}
      />
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Swords className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              {t("aboutTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              {t("aboutSubtitle")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Company Story */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-3xl rounded-2xl border border-border/50 bg-card p-6 md:p-10"
          >
            <div className="mb-4 flex items-center gap-3">
              <Target className="h-6 w-6 text-accent" />
              <h2 className="font-display text-xl font-bold">{t("aboutStoryTitle")}</h2>
            </div>
            <p className="leading-relaxed text-muted-foreground">
              {t("aboutStoryP1")}
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t("aboutStoryP2")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="mb-8 text-center font-display text-2xl font-bold">{t("aboutValuesTitle")}</h2>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {values.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-xl border border-border/50 bg-card p-6"
              >
                <v.icon className="mb-3 h-6 w-6 text-primary" />
                <h3 className="mb-2 font-display text-sm font-bold">{t(v.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(v.descKey)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-md rounded-2xl border border-accent/20 bg-accent/5 p-8"
          >
            <h2 className="font-display text-xl font-bold">{t("aboutCtaTitle")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("aboutCtaDesc")}</p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground transition-all hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" />
              {t("testYourLuck")}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 text-center">
          <span className="font-display text-sm font-bold tracking-wider text-foreground">
            BUSHIDO<span className="text-accent"> GACHA</span>
          </span>
          <p className="text-xs text-muted-foreground">{t("companyName")}</p>
          <p className="font-display text-xs tracking-wider text-muted-foreground">
            {t("allRightsReserved")}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
