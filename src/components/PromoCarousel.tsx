import { useEffect, useState, useRef } from "react";
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
}

const isExternal = (url: string) => /^https?:\/\//i.test(url);

const PromoCarousel = () => {
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true }));

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("promo_banners")
        .select("id,title,subtitle,image_url,link_url,cta_label")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setBanners((data ?? []) as PromoBanner[]);
    };
    load();
  }, []);

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

  if (banners.length === 0) return null;

  const renderSlide = (b: PromoBanner) => {
    const inner = (
      <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border/50 bg-card">
        <img
          src={b.image_url}
          alt={b.title || "Promo banner"}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {(b.title || b.subtitle || b.cta_label) && (
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
        )}
        {(b.title || b.subtitle || b.cta_label) && (
          <div className="absolute inset-y-0 left-0 flex max-w-md flex-col justify-center gap-2 p-5 sm:gap-3 sm:p-8">
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
            {b.cta_label && (
              <span className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground sm:text-sm">
                {b.cta_label}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        )}
      </div>
    );

    if (!b.link_url) {
      return <div className="block h-full w-full">{inner}</div>;
    }
    if (isExternal(b.link_url)) {
      return (
        <a href={b.link_url} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
          {inner}
        </a>
      );
    }
    return (
      <Link to={b.link_url} className="block h-full w-full">
        {inner}
      </Link>
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
