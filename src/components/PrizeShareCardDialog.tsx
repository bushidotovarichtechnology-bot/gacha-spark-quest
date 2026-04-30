import { useEffect, useState } from "react";
import { Loader2, Download, Share2, X, Image as ImageIcon } from "lucide-react";
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
  caption: string;
  shareUrl: string;
}

const PrizeShareCardDialog = ({
  open,
  onOpenChange,
  prize,
  tier,
  imageUrl,
  caption,
  shareUrl,
}: PrizeShareCardDialogProps) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let createdUrl: string | null = null;

    setLoading(true);
    setPreviewUrl(null);
    setBlob(null);

    generatePrizeShareCard({ prize, tier, imageUrl, caption, siteLabel: "bushidogacha.com" })
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
  }, [open, prize, tier, imageUrl, caption, t]);

  const fileName = `bushidogacha-${tier}-${prize.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "prize"}.png`;

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

  const handleShare = async () => {
    if (!blob) return;
    const file = new File([blob], fileName, { type: "image/png" });
    const navAny = navigator as any;
    const fullText = `${caption} ${shareUrl}`;

    // Prefer native share with files (mobile)
    if (navAny.canShare && navAny.canShare({ files: [file] })) {
      try {
        await navAny.share({
          files: [file],
          title: "BushidoGacha",
          text: fullText,
        });
        return;
      } catch {
        // user cancelled — fall through
        return;
      }
    }

    // Fallback: copy text + download image
    try {
      await navigator.clipboard.writeText(fullText);
    } catch {
      // ignore
    }
    handleDownload();
    toast({ description: t("shareCardFallbackHint") });
  };

  const hasNativeFileShare =
    typeof navigator !== "undefined" &&
    !!(navigator as any).canShare &&
    (() => {
      try {
        return (navigator as any).canShare({ files: [new File([new Blob()], "x.png", { type: "image/png" })] });
      } catch {
        return false;
      }
    })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="font-display">{t("shareCardTitle")}</DialogTitle>
          <DialogDescription>{t("shareCardDesc")}</DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-secondary/40">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-xs">{t("shareCardGenerating")}</span>
              </div>
            )}
            {previewUrl && (
              <img
                src={previewUrl}
                alt={prize}
                className="h-full w-full object-contain"
              />
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={handleDownload}
              disabled={!previewUrl}
            >
              <Download className="h-4 w-4" />
              {t("shareCardDownload")}
            </Button>
            <Button
              type="button"
              variant="neon"
              className="gap-2"
              onClick={handleShare}
              disabled={!blob}
            >
              <Share2 className="h-4 w-4" />
              {hasNativeFileShare ? t("shareCardShare") : t("shareCardSaveShare")}
            </Button>
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            <ImageIcon className="mr-1 inline h-3 w-3" />
            {t("shareCardHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrizeShareCardDialog;
