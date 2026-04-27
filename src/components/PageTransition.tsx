import { AnimatePresence, motion } from "framer-motion";
import { Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { pageVariants } from "@/lib/motion";

/**
 * Wraps <Routes> with consistent Framer Motion page transition.
 * Animation tokens (duration / easing) live in src/lib/motion.ts.
 */
const AnimatedRoutes = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen will-change-[opacity,transform,filter]"
      >
        <Routes location={location} key={location.pathname}>
          {children}
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;

