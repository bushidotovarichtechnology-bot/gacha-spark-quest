import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";
import PrizeShareCardDialog from "@/components/PrizeShareCardDialog";

interface PrizeShareMenuProps {
  prize: string;
  tier: string;
  /** Optional product image URL — used to render the share card. */
  imageUrl?: string;
  /** Optional campaign name shown on the share card. */
  campaign?: string;
  /** Optional URL to share. Defaults to current site root. */
  url?: string;
  /** Visual variant: full button (default) or compact icon-only. */
  variant?: "default" | "compact";
}

const SITE_URL = "https://bushidogacha.com";

/**
 * Share entry-point: opens the visual prize card dialog directly.
 * The dialog itself contains all sharing destinations (WA/FB/IG/Twitter/Native)
 * — using the generated PRIZE IMAGE as the primary share content, so social
 * media previews show the actual prize won, not the website's OG image.
 */
const PrizeShareMenu = ({ prize, tier, imageUrl, campaign, url, variant = "default" }: PrizeShareMenuProps) => {
  const { t } = useI18n();
  const [cardOpen, setCardOpen] = useState(false);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.origin : SITE_URL);
  const caption = t("shareCaption", { prize, tier });

  return (
    <>
      {variant === "compact" ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("sharePrize")}
          className="shrink-0"
          onClick={() => setCardOpen(true)}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => setCardOpen(true)}
        >
          <Share2 className="h-4 w-4" />
          {t("sharePrize")}
        </Button>
      )}

      <PrizeShareCardDialog
        open={cardOpen}
        onOpenChange={setCardOpen}
        prize={prize}
        tier={tier}
        imageUrl={imageUrl}
        campaign={campaign}
        caption={caption}
        shareUrl={shareUrl}
      />
    </>
  );
};

export default PrizeShareMenu;
