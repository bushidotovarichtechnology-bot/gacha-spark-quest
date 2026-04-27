/**
 * Global tier style tokens — Diamond (S) / Gold (A) / Silver (B) / Bronze (C).
 *
 * Single source of truth for tier visuals. All campaign banners, badges,
 * modals, and glows should import from here so the palette stays
 * consistent across every campaign.
 *
 * Color values themselves live as CSS custom properties in src/index.css
 * (--tier-s, --tier-a, --tier-b, --tier-c and their -light/-dark variants).
 */

export type TierLabel = "S" | "A" | "B" | "C";

export interface TierStyle {
  /** Human label */
  name: string;
  /** Tailwind class on a `bg-gradient-to-r` parent — uses CSS-variable tokens */
  bannerClass: string;
  /** Glow utility (box-shadow) */
  glowClass: string;
  /** Solid bg using the tier token */
  bgClass: string;
  /** Border using the tier token */
  borderClass: string;
  /** Text color suitable for dark backgrounds */
  textClass: string;
  /** Foreground text color when placed ON the tier banner/badge */
  onColorTextClass: string;
  /** Whether the banner is light (needs dark text/icon) */
  isLightBanner: boolean;
}

export const TIER_STYLES: Record<TierLabel, TierStyle> = {
  S: {
    name: "Diamond",
    bannerClass: "tier-banner-s",
    glowClass: "tier-glow-s",
    bgClass: "bg-tier-s",
    borderClass: "border-tier-s",
    textClass: "text-tier-s-light",
    onColorTextClass: "text-tier-s-foreground",
    isLightBanner: true,
  },
  A: {
    name: "Gold",
    bannerClass: "tier-banner-a",
    glowClass: "tier-glow-a",
    bgClass: "bg-tier-a",
    borderClass: "border-tier-a",
    textClass: "text-tier-a-light",
    onColorTextClass: "text-tier-a-foreground",
    isLightBanner: true,
  },
  B: {
    name: "Silver",
    bannerClass: "tier-banner-b",
    glowClass: "tier-glow-b",
    bgClass: "bg-tier-b",
    borderClass: "border-tier-b",
    textClass: "text-tier-b-light",
    onColorTextClass: "text-tier-b-foreground",
    isLightBanner: true,
  },
  C: {
    name: "Bronze",
    bannerClass: "tier-banner-c",
    glowClass: "tier-glow-c",
    bgClass: "bg-tier-c",
    borderClass: "border-tier-c",
    textClass: "text-tier-c-light",
    onColorTextClass: "text-tier-c-foreground",
    isLightBanner: false,
  },
};

export const getTierStyle = (label: string): TierStyle =>
  TIER_STYLES[(label as TierLabel)] ?? TIER_STYLES.C;
