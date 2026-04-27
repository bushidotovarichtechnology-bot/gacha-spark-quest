import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Routes, useLocation } from "react-router-dom";
import { memo, useMemo, type ReactNode } from "react";
import { pageVariants, duration, easing } from "@/lib/motion";

/**
 * Detect low-end device once per session.
 * Avoids GPU-heavy `filter: blur` on devices with little RAM / few cores.
 */
const isLowEndDevice = (() => {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as any).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  return mem <= 4 || cores <= 4;
})();

/** Lighter variants for low-end devices (no blur, smaller translate, faster). */
const lightPageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easing.easeOutExpo },
  },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast, ease: easing.easeStandard },
  },
};

const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.12 } },
  exit: { opacity: 0, transition: { duration: 0.08 } },
};

/**
 * Memoized children container — prevents Routes subtree from re-rendering
 * when only the AnimatedRoutes wrapper updates (e.g. parent state churn).
 * Children identity stays stable because <Route> JSX in App.tsx is static.
 */
const RoutesShell = memo(function RoutesShell({
  pathname,
  children,
}: {
  pathname: string;
  children: ReactNode;
}) {
  // `location` prop is intentionally derived from pathname so AnimatePresence
  // can swap by key without forcing the inner Routes to re-resolve every tick.
  return <Routes key={pathname}>{children}</Routes>;
});

const AnimatedRoutesInner = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const variants = useMemo(() => {
    if (prefersReducedMotion) return reducedMotionVariants;
    if (isLowEndDevice) return lightPageVariants;
    return pageVariants;
  }, [prefersReducedMotion]);

  // Hint browser only for properties we actually animate.
  const willChange = prefersReducedMotion
    ? "opacity"
    : isLowEndDevice
      ? "opacity, transform"
      : "opacity, transform, filter";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen"
        style={{ willChange }}
      >
        <RoutesShell pathname={location.pathname}>{children}</RoutesShell>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Outer memo: re-renders only when `children` reference changes.
 * In App.tsx the Route tree is declared inline once, so identity is stable
 * across context updates (Auth, I18n, Notifications).
 */
const AnimatedRoutes = memo(AnimatedRoutesInner);

export default AnimatedRoutes;
