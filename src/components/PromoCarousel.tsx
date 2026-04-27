import { useEffect, useState, useRef, useCallback } from "react";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  cta_label: string;
  starts_at: string | null;
  ends_at: string | null;
}

const isExternal = (url: string) => /^https?:\/\//i.test(url);

// Clamp the next refetch delay so we don't schedule too aggressively or too far out.
const MIN_DELAY_MS = 5_000; // 5s — avoid hot loops on near-instant transitions
const MAX_DELAY_MS = 60 * 60 * 1000; // 1h — fall back to hourly when nothing changes soon

const computeNextTransitionDelay = (banners: PromoBanner[]): number => {
  const now = Date.now();
  let nearest = Number.POSITIVE_INFINITY;

  for (const b of banners) {
    for (const ts of [b.starts_at, b.ends_at]) {
      if (!ts) continue;
      const t = new Date(ts).getTime();
      if (Number.isFinite(t) && t > now && t - now < nearest) {
        nearest = t - now;
      }
    }
  }

  if (!Number.isFinite(nearest)) return MAX_DELAY_MS;
  return Math.min(MAX_DELAY_MS, Math.max(MIN_DELAY_MS, nearest + 500));
};

const PromoCarousel = () => {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSignatureRef = useRef<string>("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("promo_banners")
      .select("id,title,subtitle,image_url,link_url,cta_label,starts_at,ends_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    const next = (data ?? []) as PromoBanner[];
    // Only update state if the payload actually changed — prevents the carousel
    // from re-mounting / resetting position on every poll (no flicker).
    const signature = JSON.stringify(next);
    if (signature !== lastSignatureRef.current) {
      lastSignatureRef.current = signature;
      setBanners(next);
    }
    setIsInitialLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reschedule a single timer to fire at the next starts_at/ends_at boundary,
  // so we only refetch when a banner actually transitions in/out.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = computeNextTransitionDelay(banners);
    timerRef.current = setTimeout(() => {
      load();
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [banners, load]);

  // Refetch when the tab becomes visible again (catches transitions that
  // happened while the tab was backgrounded and the timer was throttled).
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [load]);

  // Safety-net polling every 60s: catches admin edits (new banners, changed
  // schedules) that the adaptive timer can't know about until the next refetch.
  // Skipped while the tab is hidden to avoid wasted requests.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!api) return;
    setSelected(api.selectedScrollSnap());
    const onSelect = () => setSelected(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (isInitialLoading) {
    return (
      <section className="container mx-auto px-4 pt-6">
        <div className="aspect-[16/7] w-full animate-pulse rounded-2xl border border-border/50 bg-secondary sm:aspect-[16/5]" />
      </section>
    );
  }

  if (banners.length === 0) return null;

  const renderCTA = (b: PromoBanner) => {
    if (!b.cta_label || !b.link_url) return null;
    const stop = (e: React.MouseEvent) => e.stopPropagation();
    const cls =
      "pointer-events-auto mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform hover:scale-105 sm:text-sm";
    const content = (
      <>
        {b.cta_label}
        <ArrowRight className="h-3.5 w-3.5" />
      </>
    );
    if (isExternal(b.link_url)) {
      return (
        <a href={b.link_url} target="_blank" rel="noopener noreferrer" onClick={stop} className={cls}>
          {content}
        </a>
      );
    }
    return (
      <Link to={b.link_url} onClick={stop} className={cls}>
        {content}
      </Link>
    );
  };

  const renderSlide = (b: PromoBanner) => {
    const image = (
      <img
        src={b.image_url}
        alt={b.title || "Promo banner"}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain"
      />
    );
    const imageLayer = b.link_url ? (
      isExternal(b.link_url) ? (
        <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0">
          {image}
        </a>
      ) : (
        <Link to={b.link_url} className="absolute inset-0">
          {image}
        </Link>
      )
    ) : (
      <div className="absolute inset-0">{image}</div>
    );

    return (
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/50 bg-card">
        {imageLayer}
        {(b.title || b.subtitle || b.cta_label) && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
        )}
        {(b.title || b.subtitle || b.cta_label) && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex max-w-md flex-col justify-center gap-2 p-5 sm:gap-3 sm:p-8">
            {b.title && (
              <h3 className="font-display text-lg font-bold leading-tight text-foreground sm:text-2xl md:text-3xl">
                {b.title}
              </h3>
            )}
            {b.subtitle && (
              <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm md:text-base">
                {b.subtitle}
              </p>
            )}
            {renderCTA(b)}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="container mx-auto px-4 pt-6">
      <Carousel
        setApi={setApi}
        opts={{ loop: banners.length > 1, align: "start" }}
        plugins={banners.length > 1 ? [autoplay.current] : []}
        className="w-full"
      >
        <CarouselContent>
          {banners.map((b) => (
            <CarouselItem key={b.id}>
              <div className="aspect-[16/7] sm:aspect-[16/5]">{renderSlide(b)}</div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      {banners.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Banner ${i + 1}`}
              onClick={() => api?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === selected ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default PromoCarousel;
