import { useEffect, useState } from "react";
import { Loader2, Download, Share2, Image as ImageIcon, MessageCircle, Facebook, Instagram, Twitter, Copy, Check, Eye, X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";
import { toast } from "@/hooks/use-toast";
import { generatePrizeShareCard } from "@/lib/generateShareCard";

interface PrizeShareCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prize: string;
  tier: string;
  imageUrl?: string;
  /** Campaign name shown above the prize on the share card. */
  campaign?: string;
  caption: string;
  shareUrl: string;
}

const PrizeShareCardDialog = ({
  open,
  onOpenChange,
  prize,
  tier,
  imageUrl,
  campaign,
  caption,
  shareUrl,
}: PrizeShareCardDialogProps) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let createdUrl: string | null = null;

    setLoading(true);
    setPreviewUrl(null);
    setBlob(null);

    generatePrizeShareCard({ prize, tier, imageUrl, campaign, caption, siteLabel: "bushidogacha.com" })
      .then((b) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(b);
        setBlob(b);
        setPreviewUrl(createdUrl);
      })
      .catch((e) => {
        console.error("Failed to generate share card", e);
        if (!cancelled) {
          toast({ description: t("shareCardFailed"), variant: "destructive" });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [open, prize, tier, imageUrl, campaign, caption, t]);

  const fileName = `bushidogacha-${tier}-${prize.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "prize"}.jpg`;
  const fullText = `${caption} ${shareUrl}`;

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ description: t("shareCardDownloaded") });
  };

  const hasNativeFileShare = (() => {
    if (typeof navigator === "undefined") return false;
    const navAny = navigator as any;
    if (!navAny.canShare) return false;
    try {
      return navAny.canShare({ files: [new File([new Blob()], "x.jpg", { type: "image/jpeg" })] });
    } catch {
      return false;
    }
  })();

  /** Native share with file (mobile) — best UX, prize image becomes the post media */
  const handleNativeShare = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/jpeg" });
    const navAny = navigator as any;

    if (navAny.canShare && navAny.canShare({ files: [file] })) {
      try {
        await navAny.share({
          files: [file],
          title: prize,
          text: fullText,
        });
        return;
      } catch {
        return;
      }
    }
    // Fallback
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      /* ignore */
    }
    handleDownload();
    toast({ description: t("shareCardFallbackHint") });
  };

  /** WhatsApp: try native share with file first, else open WA web with caption + auto-download image */
  const handleWhatsapp = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/jpeg" });
    const navAny = navigator as any;
    if (navAny.canShare && navAny.canShare({ files: [file] })) {
      try {
        await navAny.share({ files: [file], title: prize, text: fullText });
        return;
      } catch {
        return;
      }
    }
    // Desktop fallback: download image + open WA web with text
    handleDownload();
    const u = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
    window.open(u, "_blank", "noopener,noreferrer");
    toast({ description: t("shareCardFallbackHint") });
  };

  /**
   * Facebook: open FB share dialog only — no auto-download.
   * FB scrapes the OG image from the shared URL (campaign detail page),
   * so make sure the campaign page exposes a proper og:image showing the prize.
   * If user wants to attach the generated card image, they can use the
   * Download button explicitly.
   */
  const handleFacebook = async () => {
    // Try native share with file first (mobile) — best UX, image becomes the post
    if (blob) {
      const file = new File([blob], fileName, { type: "image/jpeg" });
      const navAny = navigator as any;
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        try {
          await navAny.share({ files: [file], title: prize, text: fullText });
          return;
        } catch {
          // user cancelled — fall through to web sharer
        }
      }
    }
    // Copy caption so user can paste it in FB composer
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      /* ignore */
    }
    const u = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(u, "_blank", "noopener,noreferrer,width=600,height=600");
    toast({ description: t("shareFacebookHint") });
  };

  /** Instagram: no public share URL — download image + copy caption + open IG */
  const handleInstagram = async () => {
    handleDownload();
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      /* ignore */
    }
    toast({ description: t("shareInstagramHint") });
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = "instagram://app";
      setTimeout(() => {
        window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      }, 800);
    } else {
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    }
  };

  /** Twitter/X: download image + open tweet composer */
  const handleTwitter = () => {
    handleDownload();
    const u = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(u, "_blank", "noopener,noreferrer,width=600,height=600");
    toast({ description: t("shareCardFallbackHint") });
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast({ description: t("shareCopied") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="font-display">{t("shareCardTitle")}</DialogTitle>
          <DialogDescription>{t("shareCardDesc")}</DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5">
          {/* Generated prize card preview — click to view fullscreen */}
          <button
            type="button"
            onClick={() => previewUrl && setPreviewOpen(true)}
            disabled={!previewUrl}
            className="group relative block aspect-square w-full overflow-hidden rounded-xl border border-border bg-secondary/40 disabled:cursor-not-allowed"
            aria-label={t("shareCardPreview")}
          >
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-xs">{t("shareCardGenerating")}</span>
              </div>
            )}
            {previewUrl && (
              <>
                <img
                  src={previewUrl}
                  alt={prize}
                  className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                />
                {/* Hover hint */}
                <div className="absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition-opacity group-hover:bg-background/40 group-hover:opacity-100">
                  <div className="flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg">
                    <ZoomIn className="h-3.5 w-3.5" />
                    {t("shareCardPreview")}
                  </div>
                </div>
              </>
            )}
          </button>

          {/* Caption preview — final text users will share, with copy shortcut */}
          <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("shareCaptionPreview")}
              </span>
              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? t("shareCopied") : t("shareCopyLink")}
              </button>
            </div>
            <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
              {caption}
            </p>
            <p className="mt-1 truncate text-[11px] font-medium text-primary">
              {shareUrl}
            </p>
          </div>

          {/* Action row: Preview / Download / Share */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => setPreviewOpen(true)}
              disabled={!previewUrl}
            >
              <Eye className="h-4 w-4" />
              {t("shareCardPreview")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={handleDownload}
              disabled={!previewUrl}
            >
              <Download className="h-4 w-4" />
              {t("shareCardDownload")}
            </Button>
            <Button
              type="button"
              variant="neon"
              className="gap-1.5"
              onClick={handleNativeShare}
              disabled={!blob}
            >
              <Share2 className="h-4 w-4" />
              {hasNativeFileShare ? t("shareCardShare") : t("shareCardSaveShare")}
            </Button>
          </div>

          {/* Social destinations grid */}
          <div className="mt-4">
            <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("shareTitle")}
            </p>
            <div className="grid grid-cols-5 gap-2">
              <SocialTile
                label={t("shareWhatsapp")}
                icon={<MessageCircle className="h-5 w-5" />}
                tone="bg-green-500/15 text-green-500 hover:bg-green-500/25"
                onClick={handleWhatsapp}
                disabled={!blob}
              />
              <SocialTile
                label={t("shareFacebook")}
                icon={<Facebook className="h-5 w-5" />}
                tone="bg-blue-500/15 text-blue-500 hover:bg-blue-500/25"
                onClick={handleFacebook}
                disabled={!blob}
              />
              <SocialTile
                label={t("shareInstagram")}
                icon={<Instagram className="h-5 w-5" />}
                tone="bg-pink-500/15 text-pink-500 hover:bg-pink-500/25"
                onClick={handleInstagram}
                disabled={!blob}
              />
              <SocialTile
                label={t("shareTwitter")}
                icon={<Twitter className="h-5 w-5" />}
                tone="bg-sky-500/15 text-sky-500 hover:bg-sky-500/25"
                onClick={handleTwitter}
                disabled={!blob}
              />
              <SocialTile
                label={t("shareCopyLink")}
                icon={copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                tone="bg-secondary text-foreground hover:bg-secondary/70"
                onClick={handleCopyText}
              />
            </div>
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            <ImageIcon className="mr-1 inline h-3 w-3" />
            {t("shareCardHint")}
          </p>
        </div>
      </DialogContent>

      {/* Fullscreen preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl border-none bg-background/95 p-0 backdrop-blur-md">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("shareCardPreview")}</DialogTitle>
            <DialogDescription>{t("shareCardPreviewHint")}</DialogDescription>
          </DialogHeader>
          <div className="relative flex items-center justify-center p-4 sm:p-8">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={prize}
                className="max-h-[80vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
            )}
            <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
              {t("shareCardPreviewHint")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

const SocialTile = ({
  label,
  icon,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  tone: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-center justify-center gap-1 rounded-lg p-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tone}`}
  >
    {icon}
    <span className="text-[10px] font-semibold leading-tight">{label}</span>
  </button>
);

export default PrizeShareCardDialog;
