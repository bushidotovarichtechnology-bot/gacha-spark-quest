import { useState } from "react";
import { Share2, Copy, Check, Instagram, Facebook, MessageCircle, Twitter, Share, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/context/I18nContext";
import { toast } from "@/hooks/use-toast";
import PrizeShareCardDialog from "@/components/PrizeShareCardDialog";

interface PrizeShareMenuProps {
  prize: string;
  tier: string;
  /** Optional product image URL — used to render the share card. */
  imageUrl?: string;
  /** Optional URL to share. Defaults to current site root. */
  url?: string;
  /** Visual variant: full button (default) or compact icon-only. */
  variant?: "default" | "compact";
}

const SITE_URL = "https://bushidogacha.com";

const PrizeShareMenu = ({ prize, tier, imageUrl, url, variant = "default" }: PrizeShareMenuProps) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.origin : SITE_URL);
  const caption = t("shareCaption", { prize, tier });
  const fullText = `${caption} ${shareUrl}`;

  const handleWhatsapp = () => {
    const u = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    window.open(u, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleFacebook = () => {
    const u = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(caption)}`;
    window.open(u, "_blank", "noopener,noreferrer,width=600,height=600");
    setOpen(false);
  };

  const handleTwitter = () => {
    const u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(u, "_blank", "noopener,noreferrer,width=600,height=600");
    setOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast({ description: t("shareCopied") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: "Failed to copy", variant: "destructive" });
    }
  };

  const handleInstagram = async () => {
    // Instagram doesn't have a public web share URL. Copy the caption + link
    // and try to open the IG app on mobile.
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      // ignore
    }
    toast({ description: t("shareInstagramHint") });
    // Best-effort deep link (will only work if IG is installed on mobile)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = "instagram://app";
      setTimeout(() => {
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      }, 800);
    } else {
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    }
    setOpen(false);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "BushidoGacha",
          text: caption,
          url: shareUrl,
        });
        setOpen(false);
      } catch {
        // user cancelled — ignore
      }
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {variant === "compact" ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("sharePrize")}
              className="shrink-0"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2">
              <Share2 className="h-4 w-4" />
              {t("sharePrize")}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent
          align="center"
          className="w-72 p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 text-center">
            <p className="font-display text-sm font-bold text-foreground">{t("shareTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("shareDesc")}</p>
          </div>

          {/* Featured: Share as Image (mockup card) */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setCardOpen(true);
            }}
            className="mb-2 flex w-full items-center gap-2.5 rounded-lg bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 p-2.5 text-left transition-colors hover:from-primary/30 hover:via-accent/30 hover:to-primary/30 border border-accent/30"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/20 text-accent">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground">{t("shareAsImage")}</p>
              <p className="truncate text-[10px] text-muted-foreground">{t("shareCardDesc")}</p>
            </div>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <ShareTile
              label={t("shareWhatsapp")}
              icon={<MessageCircle className="h-5 w-5" />}
              onClick={handleWhatsapp}
              tone="bg-green-500/15 text-green-500 hover:bg-green-500/25"
            />
            <ShareTile
              label={t("shareFacebook")}
              icon={<Facebook className="h-5 w-5" />}
              onClick={handleFacebook}
              tone="bg-blue-500/15 text-blue-500 hover:bg-blue-500/25"
            />
            <ShareTile
              label={t("shareInstagram")}
              icon={<Instagram className="h-5 w-5" />}
              onClick={handleInstagram}
              tone="bg-pink-500/15 text-pink-500 hover:bg-pink-500/25"
            />
            <ShareTile
              label={t("shareTwitter")}
              icon={<Twitter className="h-5 w-5" />}
              onClick={handleTwitter}
              tone="bg-sky-500/15 text-sky-500 hover:bg-sky-500/25"
            />
            <ShareTile
              label={t("shareCopyLink")}
              icon={copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
              onClick={handleCopy}
              tone="bg-secondary text-foreground hover:bg-secondary/70"
            />
            {hasNativeShare && (
              <ShareTile
                label={t("shareMore")}
                icon={<Share className="h-5 w-5" />}
                onClick={handleNativeShare}
                tone="bg-primary/15 text-primary hover:bg-primary/25"
              />
            )}
          </div>
        </PopoverContent>
      </Popover>

      <PrizeShareCardDialog
        open={cardOpen}
        onOpenChange={setCardOpen}
        prize={prize}
        tier={tier}
        imageUrl={imageUrl}
        caption={caption}
        shareUrl={shareUrl}
      />
    </>
  );
};

const ShareTile = ({
  label,
  icon,
  onClick,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1 rounded-lg p-2.5 transition-colors ${tone}`}
  >
    {icon}
    <span className="text-[10px] font-semibold leading-tight">{label}</span>
  </button>
);

export default PrizeShareMenu;
