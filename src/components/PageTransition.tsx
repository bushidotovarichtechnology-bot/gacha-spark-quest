import { AnimatePresence, motion } from "framer-motion";
import { useLocation, useOutlet } from "react-router-dom";
import { Routes } from "react-router-dom";
import type { ReactNode } from "react";

/**
 * Wraps <Routes> with Framer Motion fade/slide transition keyed by pathname.
 * Triggers AFTER lazy-loaded route resolves (Suspense fallback already handled by DinoChaseLoader).
 */
const AnimatedRoutes = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen"
      >
        <Routes location={location} key={location.pathname}>
          {children}
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
