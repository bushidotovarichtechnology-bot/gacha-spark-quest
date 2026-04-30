import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SEO from "@/components/SEO";
import { organizationLd, softwareApplicationLd, websiteLd } from "@/lib/structuredData";
import { Sparkles, Shield, Clock, Trophy, Crown, ExternalLink, Send, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";
import { supabase } from "@/integrations/supabase/client";
import CampaignSearchBar from "@/components/CampaignSearchBar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import defaultAvatar from "@/assets/default-avatar.webp";

// Defer heavy / below-the-fold components so they don't block initial paint on mobile.
const PromoCarousel = lazy(() => import("@/components/PromoCarousel"));
const CategorySection = lazy(() => import("@/components/CategorySection"));
const HomeFAQ = lazy(() => import("@/components/HomeFAQ"));

/** Mounts children only when the wrapper enters (or nears) the viewport. */
const InView = ({ children, rootMargin = "300px", minHeight = 0 }: { children: React.ReactNode; rootMargin?: string; minHeight?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (shown || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [shown, rootMargin]);
  return (
    <div ref={ref} style={minHeight ? { minHeight } : undefined}>
      {shown ? children : null}
    </div>
  );
};

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

  // Realtime: auto-refetch when tier_prizes/campaign_tiers change so the
  // displayed remaining stock per campaign stays in sync with real draws.
  // Deferred until idle so it doesn't block FCP/LCP on mobile.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    const start = () => {
      channel = supabase
        .channel("home-stock")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "campaign_tiers" },
          () => queryClient.invalidateQueries({ queryKey: ["campaigns-by-category"] })
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tier_prizes" },
          () => queryClient.invalidateQueries({ queryKey: ["campaigns-by-category"] })
        )
        .subscribe();
    };
    const id = ric ? ric(start, { timeout: 3000 }) : (setTimeout(start, 2500) as unknown as number);
    return () => {
      if (ric) (window as any).cancelIdleCallback?.(id);
      else clearTimeout(id);
      if (channel) supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: categories = [] } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon, image_url, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data || [];
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
      <Suspense fallback={<div className="container mx-auto px-4 pt-6"><div className="aspect-[16/7] w-full animate-pulse rounded-2xl border border-border/50 bg-secondary sm:aspect-[16/5]" /></div>}>
        <PromoCarousel />
      </Suspense>

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

      <section id="featured-campaigns" className="scroll-mt-20 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-6 text-center animate-fade-in">
            <p className="mb-2 font-display text-xs font-semibold uppercase tracking-[0.3em] text-accent">
              {t("liveNow")}
            </p>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("featuredCampaigns")}
            </h2>
          </div>

          {/* Search bar: cari campaign atau prize */}
          <div className="mb-6">
            <CampaignSearchBar />
          </div>
        </div>

        <div className="space-y-2">
          <Suspense fallback={<div className="h-64" />}>
            {categories.map((cat, idx) => (
              <InView key={cat.id} rootMargin="400px" minHeight={idx === 0 ? 0 : 320}>
                <CategorySection
                  categoryId={cat.id}
                  categoryName={cat.name}
                  categoryIcon={cat.icon}
                  categoryImage={cat.image_url}
                />
              </InView>
            ))}
          </Suspense>
        </div>
      </section>

      {/* Grand Prize Leaderboard Preview — defer until near viewport */}
      <InView rootMargin="200px" minHeight={120}>
        <GrandPrizePreview />
      </InView>

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

      <InView rootMargin="200px" minHeight={300}>
        <Suspense fallback={<div className="h-64" />}>
          <HomeFAQ />
        </Suspense>
      </InView>

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
