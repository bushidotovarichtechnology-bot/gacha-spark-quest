import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { History, Crown, Star, Gift, Award, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useGacha } from "@/context/GachaContext";
import { useI18n } from "@/context/I18nContext";
import { format } from "date-fns";

const tierMeta: Record<string, { color: string; icon: typeof Crown; bg: string; label: string }> = {
  S: { color: "text-accent", icon: Crown, bg: "bg-accent/10", label: "Grand Prize" },
  A: { color: "text-neon-purple", icon: Star, bg: "bg-primary/10", label: "Tier A" },
  B: { color: "text-neon-pink", icon: Gift, bg: "bg-pink-500/10", label: "Tier B" },
  C: { color: "text-muted-foreground", icon: Award, bg: "bg-muted/20", label: "Tier C" },
};

const DrawHistory = () => {
  const { drawHistory } = useGacha();
  const { t } = useI18n();
  const [filter, setFilter] = useState<"all" | "S" | "A" | "B" | "C">("all");

  const filtered = filter === "all" ? drawHistory : drawHistory.filter((d) => d.tier === filter);

  const tierCounts = {
    S: drawHistory.filter((d) => d.tier === "S").length,
    A: drawHistory.filter((d) => d.tier === "A").length,
    B: drawHistory.filter((d) => d.tier === "B").length,
    C: drawHistory.filter((d) => d.tier === "C").length,
  };

  return (
    <div className="min-h-screen pb-8">
      <Navbar />
      <div className="container mx-auto px-4 pt-24">
        <div className="mb-8">
          <h1 className="mb-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t("drawHistory")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("drawHistoryDesc")}</p>
        </div>

        {/* Summary stats */}
        <div className="mb-6 grid grid-cols-5 gap-2">
          {(["all", "S", "A", "B", "C"] as const).map((f) => {
            const active = filter === f;
            const count = f === "all" ? drawHistory.length : tierCounts[f];
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl border p-2.5 text-center transition-all ${
                  active
                    ? "border-primary/50 bg-primary/10 box-glow-purple"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <p className={`font-display text-lg font-bold ${active ? "text-primary" : "text-foreground"}`}>
                  {count}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {f === "all" ? t("all") : f === "S" ? t("grand") : `${t("tierA").split(" ")[0]} ${f}`}
                </p>
              </button>
            );
          })}
        </div>

        {/* History list */}
        <div className="space-y-2">
          {filtered.map((entry, i) => {
            const meta = tierMeta[entry.tier];
            const Icon = meta.icon;
            let dateStr = entry.drawnAt;
            try {
              dateStr = format(new Date(entry.drawnAt), "MMM d, yyyy · HH:mm");
            } catch {}

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3 transition-colors hover:border-primary/30"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                  <Icon className={`h-5 w-5 ${meta.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 font-display text-[10px] font-black ${meta.bg} ${meta.color}`}>
                      {entry.tier}
                    </span>
                    <h3 className="truncate text-sm font-semibold text-foreground">{entry.prize}</h3>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {entry.campaign} · {dateStr}
                  </p>
                </div>
                <Link
                  to={`/campaign/${entry.campaignId}`}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <History className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="font-display text-sm text-muted-foreground">
              {drawHistory.length === 0 ? t("noDrawsYet") : t("noItemsCategory")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawHistory;
