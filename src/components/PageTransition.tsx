import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Routes, useLocation } from "react-router-dom";
import {
  memo,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { pageVariants, duration, easing } from "@/lib/motion";
import DinoChaseLoader from "./DinoChaseLoader";

const isLowEndDevice = (() => {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as any).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  return mem <= 4 || cores <= 4;
})();

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
 * Inner page wrapper. Mounts ONLY after Suspense resolves the lazy chunk,
 * because Suspense lives OUTSIDE this component. When the chunk is still
 * loading, this component never renders — the loader shows instead.
 *
 * The first paint after resolve fires `useEffect` → flips `mounted = true`,
 * which triggers the Framer Motion `animate` state on the next frame.
 * This guarantees the fade/slide runs AFTER the loader fully unmounts.
 */
const PageContent = memo(function PageContent({
  pathname,
  variants,
  willChange,
  children,
}: {
  pathname: string;
  variants: typeof pageVariants;
  willChange: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // rAF ensures the loader has been removed from the DOM before we animate.
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <motion.div
      key={pathname}
      variants={variants}
      initial="initial"
      animate={mounted ? "animate" : "initial"}
      exit="exit"
      className="min-h-screen"
      style={{ willChange }}
    >
      <Routes>{children}</Routes>
    </motion.div>
  );
});

/**
 * AnimatedRoutes flow:
 *   1. URL changes → React renders new <PageContent> (lazy chunk may suspend).
 *   2. <Suspense fallback={DinoChaseLoader}> shows loader during chunk fetch.
 *   3. Chunk resolves → PageContent mounts → useEffect triggers fade/slide in.
 *   4. AnimatePresence handles exit of the previous PageContent in parallel.
 */
const AnimatedRoutesInner = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const variants = useMemo(() => {
    if (prefersReducedMotion) return reducedMotionVariants;
    if (isLowEndDevice) return lightPageVariants;
    return pageVariants;
  }, [prefersReducedMotion]);

  const willChange = prefersReducedMotion
    ? "opacity"
    : isLowEndDevice
      ? "opacity, transform"
      : "opacity, transform, filter";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense key={location.pathname} fallback={<DinoChaseLoader />}>
        <PageContent
          pathname={location.pathname}
          variants={variants as typeof pageVariants}
          willChange={willChange}
        >
          {children}
        </PageContent>
      </Suspense>
    </AnimatePresence>
  );
};

const AnimatedRoutes = memo(AnimatedRoutesInner);

export default AnimatedRoutes;
