"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Subtle fade/slide on route change. Keyed by pathname so each navigation
 * gets its own enter/exit; `initial={false}` on `AnimatePresence` skips the
 * animation for whatever's on screen at first load, so a fresh visit never
 * waits on this — only client-side navigations after that do.
 */

const DURATION = 0.2;
const EASE = "easeOut";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: DURATION, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
