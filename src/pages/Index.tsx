import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CampaignCard from "@/components/CampaignCard";
import { Sparkles, Shield, Clock, Trophy } from "lucide-react";
import { useI18n } from "@/context/I18nContext";

import campaignBlindbox from "@/assets/campaign-blindbox.jpg";
import campaignDesksetup from "@/assets/campaign-desksetup.jpg";
import campaignWallet from "@/assets/campaign-wallet.jpg";
import campaignFigurine from "@/assets/campaign-figurine.jpg";
import campaignGaming from "@/assets/campaign-gaming.jpg";

const campaigns = [
  { id: "mystery-box", title: "Mystery Blind Box", image: campaignBlindbox, price: 5, remaining: 45, total: 100, hot: true },
  { id: "desk-setup", title: "Ultimate Desk Setup", image: campaignDesksetup, price: 15, remaining: 12, total: 50, hot: false },
  { id: "digital-wallet", title: "Digital Wallets", image: campaignWallet, price: 8, remaining: 78, total: 200, hot: true },
  { id: "rare-figurine", title: "Rare Figurine Collection", image: campaignFigurine, price: 10, remaining: 8, total: 30, hot: false },
  { id: "gaming-bundle", title: "Gaming Console Bundle", image: campaignGaming, price: 20, remaining: 5, total: 25, hot: true },
  { id: "mystery-box-2", title: "Midnight Mystery Box", image: campaignBlindbox, price: 3, remaining: 120, total: 300, hot: false },
];

const Index = () => {
  const { t } = useI18n();

  const features = [
    { icon: Shield, title: t("verifiedFair"), desc: t("verifiedFairDesc") },
    { icon: Clock, title: t("limitedPools"), desc: t("limitedPoolsDesc") },
    { icon: Trophy, title: t("pitySystem"), desc: t("pitySystemDesc") },
    { icon: Sparkles, title: t("lastOnePrize"), desc: t("lastOnePrizeDesc") },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />

      <section className="border-y border-border/50 bg-secondary/30">
        <div className="container mx-auto grid grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-2 text-center"
            >
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="font-display text-xs font-semibold tracking-wide text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              {t("liveNow")}
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("featuredCampaigns")}
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} {...c} />
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="font-display text-xs tracking-wider text-muted-foreground">
            {t("allRightsReserved")}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
