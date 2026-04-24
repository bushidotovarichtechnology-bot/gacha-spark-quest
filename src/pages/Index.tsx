import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import CampaignCard from "@/components/CampaignCard";
import SEO from "@/components/SEO";
import { organizationLd, softwareApplicationLd, websiteLd } from "@/lib/structuredData";
import { Sparkles, Shield, Clock, Trophy, Crown, ExternalLink, Send, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import CategoryMenu from "@/components/CategoryMenu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import defaultAvatar from "@/assets/default-avatar.webp";

import campaignBlindbox from "@/assets/campaign-blindbox.jpg";
import campaignDesksetup from "@/assets/campaign-desksetup.jpg";
import campaignWallet from "@/assets/campaign-wallet.jpg";
import campaignFigurine from "@/assets/campaign-figurine.jpg";
import campaignGaming from "@/assets/campaign-gaming.jpg";

// Fallback image map for campaigns using local assets
const imageMap: Record<string, string> = {
  "/assets/campaign-blindbox.jpg": campaignBlindbox,
  "/assets/campaign-desksetup.jpg": campaignDesksetup,
  "/assets/campaign-wallet.jpg": campaignWallet,
  "/assets/campaign-figurine.jpg": campaignFigurine,
  "/assets/campaign-gaming.jpg": campaignGaming,
};

function resolveImage(url: string) {
  return imageMap[url] || url || campaignBlindbox;
}

interface GrandPrizeWinner {
  draw_id: string;
  display_name: string;
  avatar_url: string;
  prize_name: string;
  campaign_id: string;
  campaign_title: string;
  won_at: string;
}

const GrandPrizePreview = () => {
  const [winners, setWinners] = useState<GrandPrizeWinner[]>([]);

  useEffect(() => {
    supabase.rpc("get_grand_prize_winners", { lim: 5 }).then(({ data }) => {
      if (data) setWinners(data as unknown as GrandPrizeWinner[]);
    });
  }, []);

  if (winners.length === 0) return null;

  return (
    <section className="border-t border-border/50 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 text-center animate-fade-in">
          <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Hall of Fame
          </p>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Pemenang Grand Prize
          </h2>
        </div>

        <div className="mx-auto max-w-lg space-y-2">
          {winners.map((w, i) => (
            <div
              key={w.draw_id}
              className={`flex items-center gap-3 rounded-xl border p-3 animate-fade-in ${
                i === 0 ? "border-accent/40 bg-accent/5" : "border-border/50 bg-card"
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="text-lg font-black w-7 text-center">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <Avatar className="h-9 w-9 border-2 border-accent/20">
                <AvatarImage src={w.avatar_url || defaultAvatar} />
                <AvatarFallback><img src={defaultAvatar} alt="" className="h-full w-full object-cover" /></AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{w.display_name}</p>
                <p className="flex items-center gap-1 truncate text-xs text-accent">
                  <Crown className="h-3 w-3 shrink-0" /> {w.prize_name}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {w.campaign_title} · {formatDistanceToNow(new Date(w.won_at), { addSuffix: true, locale: idLocale })}
                </p>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="shrink-0 gap-1 border-accent/30 hover:bg-accent/10 hover:text-accent"
              >
                <Link to={`/campaign/${w.campaign_id}`} aria-label={`Lihat campaign ${w.campaign_title}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Detail</span>
                </Link>
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/30 px-4 py-2 text-sm font-semibold text-accent transition-all hover:bg-accent/20"
          >
            <Trophy className="h-4 w-4" />
            Lihat Semua Pemenang
          </Link>
        </div>
      </div>
    </section>
  );
};

const Index = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);

  // Realtime: auto-refetch when campaign_tiers changes (e.g. another user draws)
  useEffect(() => {
    const channel = supabase
      .channel("home-campaign-tiers")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "campaign_tiers" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["campaigns", selectedSubcategoryId],
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select("id, slug, title, image_url, price, is_hot, subcategory_id, sort_order, created_at")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (selectedSubcategoryId) {
        query = query.eq("subcategory_id", selectedSubcategoryId);
      }

      const { data: camps, error } = await query;
      if (error) throw error;

      // Fetch coarse stock buckets from server (no exact counts leak to client)
      const campaignIds = (camps || []).map((c) => c.id);
      const stockByCampaign: Record<string, { remaining: number; total: number; isSoldOut: boolean }> = {};

      if (campaignIds.length > 0) {
        const { data: summaries } = await supabase.rpc("get_campaign_stock_summary" as any, {
          _campaign_ids: campaignIds,
        });
        // Aggregate per-campaign. We approximate "remaining" from the bucket
        // label (for the progress bar) — exact value never leaves the server.
        const bucketToApprox = (b: string): number => {
          if (b === "0") return 0;
          if (b === "<5") return 3;
          if (b === "5+") return 7;
          if (b === "10+") return 17;
          if (b === "25+") return 37;
          if (b === "50+") return 75;
          const n = parseInt(b, 10);
          return Number.isFinite(n) ? n + 25 : 0;
        };
        (summaries || []).forEach((s: any) => {
          const acc = stockByCampaign[s.campaign_id] ||
            (stockByCampaign[s.campaign_id] = { remaining: 0, total: 0, isSoldOut: true });
          acc.remaining += bucketToApprox(s.remaining_bucket);
          acc.total += s.total_bucket || 0;
          if (!s.is_sold_out) acc.isSoldOut = false;
        });
      }

      return (camps || []).map((c) => {
        const s = stockByCampaign[c.id] || { remaining: 0, total: 0, isSoldOut: true };
        return {
          id: c.id,
          slug: (c as any).slug as string | undefined,
          title: c.title,
          image: resolveImage(c.image_url),
          price: c.price,
          remaining: s.remaining,
          total: s.total,
          hot: c.is_hot,
        };
      });
    },
  });

  const features = [
    { icon: Shield, title: t("verifiedFair"), desc: t("verifiedFairDesc") },
    { icon: Clock, title: t("limitedPools"), desc: t("limitedPoolsDesc") },
    { icon: Trophy, title: t("pitySystem"), desc: t("pitySystemDesc") },
    { icon: Sparkles, title: t("lastOnePrize"), desc: t("lastOnePrizeDesc") },
  ];

  return (
    <div className="min-h-screen">
      <SEO
        title={t("seoHomeTitle")}
        description={t("seoHomeDesc")}
        canonicalPath="/"
        jsonLd={[organizationLd, softwareApplicationLd, websiteLd]}
      />
      <Navbar />
      <HeroSection />

      <section className="border-y border-border/50 bg-secondary/30">
        <div className="container mx-auto grid grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="flex flex-col items-center gap-2 text-center animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <f.icon className="h-6 w-6 text-accent" />
              <h3 className="font-display text-xs font-semibold tracking-wide text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="featured-campaigns" className="scroll-mt-20 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center animate-fade-in">
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              {t("liveNow")}
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("featuredCampaigns")}
            </h2>
          </div>

          <div className="mb-8">
            <CategoryMenu selectedSubcategoryId={selectedSubcategoryId} onSelect={setSelectedSubcategoryId} />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-secondary" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:gap-6">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} {...c} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Grand Prize Leaderboard Preview */}
      <GrandPrizePreview />

      {/* SEO long-form: Why + Pity System */}
      <section className="border-t border-border/50 py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <article className="space-y-6">
            <header>
              <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Bushido Gacha
              </p>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("seoSectionWhyTitle")}
              </h2>
            </header>
            <p className="leading-relaxed text-muted-foreground">{t("seoSectionWhyP1")}</p>
            <p className="leading-relaxed text-muted-foreground">{t("seoSectionWhyP2")}</p>

            <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" />
                <h3 className="font-display text-lg font-bold text-foreground">{t("seoPityTitle")}</h3>
              </div>
              <p className="mb-3 leading-relaxed text-muted-foreground">{t("seoPityP1")}</p>
              <p className="leading-relaxed text-muted-foreground">{t("seoPityP2")}</p>
            </div>
          </article>
        </div>
      </section>

      {/* SEO: Coin Transfer (Fitur Sosial) */}
      <section id="kirim-koin" className="border-t border-border/50 bg-secondary/20 py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <article className="space-y-6">
            <header className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                <Send className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t("seoCoinTransferTitle")}
              </h2>
            </header>
            <p className="leading-relaxed text-muted-foreground">{t("seoCoinTransferP1")}</p>

            <div className="rounded-2xl border border-border/50 bg-card p-6">
              <h3 className="mb-4 font-display text-lg font-bold text-foreground">
                {t("seoCoinTransferHowTitle")}
              </h3>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                  <span>{t("seoCoinTransferStep1")}</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                  <span>{t("seoCoinTransferStep2")}</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                  <span>{t("seoCoinTransferStep3")}</span>
                </li>
              </ol>
            </div>

            <p className="leading-relaxed text-muted-foreground">{t("seoCoinTransferP2")}</p>

            <div className="text-center">
              <Button asChild variant="gold" className="gap-2">
                <Link to="/gift">
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {t("seoSendCoins")}
                </Link>
              </Button>
            </div>
          </article>
        </div>
      </section>

      {/* SEO USP closer */}
      <section className="border-t border-border/50 py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <article className="space-y-4 text-center">
            <Users className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("seoUspTitle")}
            </h2>
            <p className="leading-relaxed text-muted-foreground">{t("seoUspP1")}</p>
            <p className="leading-relaxed text-muted-foreground">{t("seoUspP2")}</p>
          </article>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="container mx-auto flex flex-col items-center gap-3 px-4 text-center">
          <span className="font-display text-sm font-bold tracking-wider text-foreground">
            BUSHIDO<span className="text-accent"> GACHA</span>
          </span>
          <p className="text-xs text-muted-foreground">
            {t("companyName")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link to="/about" className="text-xs text-muted-foreground underline transition-colors hover:text-foreground">
              {t("aboutUs")}
            </Link>
            <Link to="/contact" className="text-xs text-muted-foreground underline transition-colors hover:text-foreground">
              {t("contactUs")}
            </Link>
            <Link to="/terms" className="text-xs text-muted-foreground underline transition-colors hover:text-foreground">
              {t("termsAndConditions")}
            </Link>
            <Link to="/privacy" className="text-xs text-muted-foreground underline transition-colors hover:text-foreground">
              {t("privacyPolicy")}
            </Link>
          </div>
          <p className="font-display text-xs tracking-wider text-muted-foreground">
            {t("allRightsReserved")}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
