import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Trophy, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/context/I18nContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import defaultAvatar from "@/assets/default-avatar.webp";

interface Winner {
  draw_id: string;
  user_id: string;
  display_name: string;
  avatar_url: string;
  prize_name: string;
  campaign_id: string;
  campaign_title: string;
  won_at: string;
}

const rankStyle = (i: number) => {
  if (i === 0) return "border-accent/60 bg-accent/5 box-glow-gold";
  if (i === 1) return "border-primary/40 bg-primary/5";
  if (i === 2) return "border-neon-pink/40 bg-neon-pink/5";
  return "border-border/50";
};

const rankBadge = (i: number) => {
  if (i === 0) return "🥇";
  if (i === 1) return "🥈";
  if (i === 2) return "🥉";
  return `#${i + 1}`;
};

const Leaderboard = () => {
  const { t } = useI18n();
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .rpc("get_grand_prize_winners", { lim: 50 })
      .then(({ data }) => {
        setWinners((data as unknown as Winner[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToCampaigns")}
        </Link>

        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-yellow-400 box-glow-gold"
          >
            <Trophy className="h-8 w-8 text-background" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-foreground">
            Hall of Fame
          </h1>
          <p className="mt-2 text-muted-foreground">
            Daftar pemenang Grand Prize dari semua campaign
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : winners.length === 0 ? (
          <div className="py-16 text-center">
            <Crown className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">
              Belum ada pemenang Grand Prize — jadilah yang pertama!
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            {winners.map((w, i) => (
              <motion.div
                key={w.draw_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`border ${rankStyle(i)}`}>
                  <CardContent className="flex items-center gap-3 py-3">
                    {/* Rank */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg font-black">
                      {rankBadge(i)}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-10 w-10 shrink-0 border-2 border-accent/30">
                      <AvatarImage src={w.avatar_url || defaultAvatar} alt={w.display_name} />
                      <AvatarFallback>
                        <img src={defaultAvatar} alt="" className="h-full w-full object-cover" />
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">
                        {w.display_name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-accent font-semibold">
                        <Crown className="h-3 w-3" />
                        {w.prize_name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {w.campaign_title} · {formatDistanceToNow(new Date(w.won_at), { addSuffix: true, locale: idLocale })}
                      </p>
                    </div>

                    {/* Trophy for top 3 */}
                    {i < 3 && (
                      <Sparkles className={`h-5 w-5 shrink-0 ${i === 0 ? "text-accent" : i === 1 ? "text-primary" : "text-neon-pink"}`} />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
