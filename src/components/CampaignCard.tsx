import { Link } from "react-router-dom";
import { Coins, Flame } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { useEffect, useRef, useState } from "react";
import { obfuscateStock } from "@/lib/obfuscateStock";

interface CampaignCardProps {
  id: string;
  slug?: string;
  title: string;
  image: string;
  price: number;
  remaining: number;
  total: number;
  hot?: boolean;
}

const CampaignCard = ({ id, slug, title, image, price, remaining, total, hot }: CampaignCardProps) => {
  const { t } = useI18n();
  const obf = obfuscateStock(remaining, total);
  const percentage = obf.percentage;
  const isSoldOut = obf.isSoldOut;
  const isLow = obf.isLow;
  const prevRemaining = useRef(remaining);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevRemaining.current !== remaining) {
      setFlash(true);
      prevRemaining.current = remaining;
      const timer = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [remaining]);

  // Lighthouse: cards display ~175px wide on mobile (45vw) and ~315px at 2x DPR.
  // Serve 240w default, step up to 360w for high-DPI; drop the 480w variant
  // entirely (saved ~140 KiB across the visible card grid on mobile).
  const isSupabase = image.includes("/storage/v1/object/public/");
  const base = isSupabase ? image.replace("/object/public/", "/render/image/public/") : image;
  const src = isSupabase ? `${base}?width=240&quality=66&resize=contain` : image;
  const srcSet = isSupabase
    ? `${base}?width=180&quality=64&resize=contain 180w, ${base}?width=240&quality=66&resize=contain 240w, ${base}?width=360&quality=68&resize=contain 360w`
    : undefined;

  // Map remaining % to a tier-themed visual: high=Diamond, mid=Gold, low=Silver, almost out=Bronze
  // Keeps landing cards visually consistent with the new tier banner palette.
  const stockTier: "S" | "A" | "B" | "C" = isSoldOut
    ? "C"
    : percentage > 66
    ? "S"
    : percentage > 33
    ? "A"
    : percentage > 10
    ? "B"
    : "C";

  const tierGlowClass = {
    S: "group-hover:tier-glow-s group-hover:border-tier-s/60",
    A: "group-hover:tier-glow-a group-hover:border-tier-a/60",
    B: "group-hover:tier-glow-b group-hover:border-tier-b/60",
    C: "group-hover:tier-glow-c group-hover:border-tier-c/60",
  }[stockTier];

  const tierBarClass = {
    S: "tier-banner-s",
    A: "tier-banner-a",
    B: "tier-banner-b",
    C: "tier-banner-c",
  }[stockTier];

  const flashGlow = "border-tier-a/80 tier-glow-a";

  return (
    <Link to={`/campaign/${slug || id}`} className="group block transition-transform duration-300 hover:-translate-y-1">
      <div className={`gradient-card relative overflow-hidden rounded-xl border transition-all duration-300 ${isSoldOut ? "border-border/30 opacity-60 grayscale" : flash ? flashGlow : `border-border/50 ${tierGlowClass}`}`}>
        {/* Tier shard sweep — only on hover, hidden on small screens via [data-fx=secondary] */}
        {!isSoldOut && (
          <div
            data-fx="secondary"
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0 transition-opacity duration-300 group-hover:opacity-60 group-hover:animate-shine-sweep bg-gradient-to-r from-transparent via-white/40 to-transparent blur-sm"
          />
        )}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={src}
            srcSet={srcSet}
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 240px"
            alt={`Banner kampanye gacha ${title} — Bushido Gacha`}
            width={240}
            height={240}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          {isSoldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
              <span className="rounded-full bg-muted px-4 py-1.5 text-xs font-bold tracking-wide text-muted-foreground">
                SOLD OUT
              </span>
            </div>
          )}
          {!isSoldOut && hot && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full tier-banner-a px-2.5 py-1 text-xs font-bold text-tier-a-foreground backdrop-blur-sm tier-glow-a">
              <Flame className="h-3 w-3" /> {t("hot")}
            </div>
          )}
          {isLow && (
            <div className="absolute right-3 top-3 rounded-full tier-banner-c px-2.5 py-1 text-xs font-bold text-tier-c-foreground backdrop-blur-sm tier-glow-c animate-pulse-glow">
              {t("almostGone")}
            </div>
          )}
        </div>

        <div className="p-4">
          <h3 className="mb-2 font-display text-sm font-semibold tracking-wide text-foreground">
            {title}
          </h3>

          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-accent">{price}</span>
              <Coins className="h-4 w-4 text-accent" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("remaining")}</span>
              <span className={`transition-all duration-300 ${flash ? "text-accent font-bold scale-110" : isLow ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                {obf.fractionLabel}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${flash ? "tier-banner-a" : tierBarClass}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CampaignCard;
