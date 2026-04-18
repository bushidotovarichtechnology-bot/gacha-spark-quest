import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import heroImage from "@/assets/hero-gacha.jpg";

const HeroSection = () => {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden pt-16">
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Bushido Gacha"
          width={1280}
          height={720}
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </div>

      <div className="container relative mx-auto flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4 font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent"
          >
            {t("wayOfFortune")}
          </motion.p>

          <h1 className="mb-6 font-display text-4xl font-black leading-tight tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            {t("drawYour")}
            <span className="block text-glow-purple text-primary"> {t("destiny")}</span>
          </h1>

          <p className="mx-auto mb-8 max-w-md text-base text-muted-foreground sm:text-lg">
            {t("heroDesc")}
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
          >
            <Button
              variant="gold"
              size="lg"
              className="gap-2 px-8 py-6 text-base"
              onClick={() => {
                document.getElementById("featured-campaigns")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <Sparkles className="h-5 w-5" />
              {t("testYourLuck")}
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-8"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/40 p-1">
            <div className="mx-auto h-2 w-1 rounded-full bg-muted-foreground/60" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
