import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, Flame } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { useEffect, useRef, useState } from "react";

interface CampaignCardProps {
  id: string;
  title: string;
  image: string;
  price: number;
  remaining: number;
  total: number;
  hot?: boolean;
}

const CampaignCard = ({ id, title, image, price, remaining, total, hot }: CampaignCardProps) => {
  const { t } = useI18n();
  const percentage = total > 0 ? (remaining / total) * 100 : 0;
  const isSoldOut = remaining <= 0;
  const isLow = !isSoldOut && percentage < 30;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Link to={`/campaign/${id}`} className="group block">
        <div className={`gradient-card overflow-hidden rounded-xl border transition-all duration-300 ${isSoldOut ? "border-border/30 opacity-60 grayscale" : flash ? "border-accent/80 box-glow-gold" : "border-border/50 group-hover:border-primary/50 group-hover:box-glow-purple"}`}>
          <div className="relative aspect-square overflow-hidden">
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
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
              <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-destructive/90 px-2.5 py-1 text-xs font-bold text-destructive-foreground backdrop-blur-sm">
                <Flame className="h-3 w-3" /> {t("hot")}
              </div>
            )}
            {isLow && (
              <div className="absolute right-3 top-3 rounded-full bg-accent/90 px-2.5 py-1 text-xs font-bold text-accent-foreground backdrop-blur-sm animate-pulse-glow">
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
                <Ticket className="h-4 w-4 text-accent" />
                <span className="text-lg font-bold text-accent">${price}</span>
                <span className="text-xs text-muted-foreground">{t("ticket")}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("remaining")}</span>
                <span className={`transition-all duration-300 ${flash ? "text-accent font-bold scale-110" : isLow ? "font-semibold text-destructive" : "text-muted-foreground"}`}>
                  {remaining}/{total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  className={`h-full rounded-full transition-colors duration-500 ${flash ? "bg-accent" : isLow ? "bg-destructive" : "bg-primary"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default CampaignCard;
