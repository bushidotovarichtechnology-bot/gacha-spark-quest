/**
 * Centralized Framer Motion transition tokens.
 * Use these everywhere for a consistent, premium feel.
 *
 * Easing references:
 *  - easeOutExpo:   page enters / hero reveals
 *  - easeInOutQuart: shared element / layout transitions
 *  - easeOutBack:   playful pop (badges, modals)
 *  - easeStandard:  default UI micro-interactions (Material standard)
 */
import type { Transition, Variants } from "framer-motion";

export const easing = {
  easeOutExpo: [0.16, 1, 0.3, 1] as const,
  easeInOutQuart: [0.76, 0, 0.24, 1] as const,
  easeOutBack: [0.34, 1.56, 0.64, 1] as const,
  easeStandard: [0.4, 0, 0.2, 1] as const,
} as const;

export const duration = {
  fast: 0.18,
  base: 0.28,
  slow: 0.42,
  slower: 0.6,
} as const;

/** Default transition for page-level enter/exit. */
export const pageTransition: Transition = {
  duration: duration.base,
  ease: easing.easeOutExpo,
};

/** Reusable variants for full-page route transitions. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 14, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { ...pageTransition, duration: duration.slow },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(2px)",
    transition: { duration: duration.fast, ease: easing.easeStandard },
  },
};

/** Stagger helper for child sections inside a page. */
export const sectionVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: duration.base,
      ease: easing.easeOutExpo,
      delay: 0.05 + i * 0.06,
    },
  }),
};

/** Modal / popover enter & exit. */
export const modalTransition: Transition = {
  duration: duration.base,
  ease: easing.easeOutBack,
};

/* ============================================================
 * Per-route page variants
 * Each variant is tuned to match the "feel" of the destination.
 * ============================================================ */

/** Draw room — dramatic glow + scale, like opening a treasure chest. */
export const glowPageVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
    filter: "blur(8px) brightness(1.4)",
    boxShadow: "0 0 0px hsl(var(--primary) / 0)",
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px) brightness(1)",
    transition: { duration: duration.slow, ease: easing.easeOutExpo },
  },
  exit: {
    opacity: 0,
    scale: 1.02,
    filter: "blur(6px) brightness(1.2)",
    transition: { duration: duration.fast, ease: easing.easeStandard },
  },
};

/** Inventory / lists — horizontal slide like sliding a drawer. */
export const slidePageVariants: Variants = {
  initial: { opacity: 0, x: 32 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.base, ease: easing.easeOutExpo },
  },
  exit: {
    opacity: 0,
    x: -24,
    transition: { duration: duration.fast, ease: easing.easeStandard },
  },
};

/** Auth / forms — gentle scale-up, focused entry. */
export const popPageVariants: Variants = {
  initial: { opacity: 0, scale: 0.94, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: duration.base, ease: easing.easeOutBack },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: duration.fast, ease: easing.easeStandard },
  },
};

/** Admin dashboards — quick crossfade, productivity feel. */
export const fadePageVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: duration.base, ease: easing.easeStandard },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast, ease: easing.easeStandard },
  },
};

/** Map a pathname to its page variant. */
export const getPageVariantsFor = (pathname: string): Variants => {
  if (/^\/campaign\/[^/]+/.test(pathname)) return glowPageVariants;
  if (/^\/(inventory|history|claims|transactions|redeem)/.test(pathname))
    return slidePageVariants;
  if (/^\/(login|register|forgot-password|reset-password|admin\/login)/.test(pathname))
    return popPageVariants;
  if (/^\/admin/.test(pathname)) return fadePageVariants;
  return pageVariants;
};

