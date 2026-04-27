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
import { duration, easing, getPageVariantsFor, pageVariants } from "@/lib/motion";
import DinoChaseLoader from "./DinoChaseLoader";
import NeonTopProgress from "./NeonTopProgress";

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
 * Mounts only after Suspense resolves the lazy chunk.
 * Notifies parent via `onReady` so the top neon progress bar can finish.
 */
const PageContent = memo(function PageContent({
  pathname,
  variants,
  willChange,
  onReady,
  children,
}: {
  pathname: string;
  variants: typeof pageVariants;
  willChange: string;
  onReady: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
      onReady();
    });
    return () => cancelAnimationFrame(raf);
  }, [onReady]);

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

const AnimatedRoutesInner = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [isLoading, setIsLoading] = useState(false);

  // Trigger loading state immediately when pathname changes; child clears it.
  useEffect(() => {
    setIsLoading(true);
  }, [location.pathname]);

  const variants = useMemo(() => {
    if (prefersReducedMotion) return reducedMotionVariants;
    if (isLowEndDevice) return lightPageVariants;
    return getPageVariantsFor(location.pathname);
  }, [prefersReducedMotion, location.pathname]);

  const willChange = prefersReducedMotion
    ? "opacity"
    : isLowEndDevice
      ? "opacity, transform"
      : "opacity, transform, filter";

  const handleReady = useMemo(
    () => () => setIsLoading(false),
    []
  );

  return (
    <>
      <NeonTopProgress isLoading={isLoading} />
      <AnimatePresence mode="wait" initial={false}>
        <Suspense key={location.pathname} fallback={<DinoChaseLoader />}>
          <PageContent
            pathname={location.pathname}
            variants={variants as typeof pageVariants}
            willChange={willChange}
            onReady={handleReady}
          >
            {children}
          </PageContent>
        </Suspense>
      </AnimatePresence>
    </>
  );
};

const AnimatedRoutes = memo(AnimatedRoutesInner);

export default AnimatedRoutes;
