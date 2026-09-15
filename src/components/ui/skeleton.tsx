"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Base shimmer block for loading states. Same `useReducedMotion()` pattern
 * as `components/motion/reveal.tsx`/`count-up.tsx`: a moving gradient sweep
 * when motion is allowed, a flat static fill when it isn't. Never the
 * largest paint candidate for real content — it only ever stands in for
 * content that hasn't arrived yet — so it carries no LCP risk either way.
 */
export function Skeleton({ className }: { className?: string }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <div
        aria-hidden="true"
        className={cn("rounded-lg bg-paper-dim", className)}
      />
    );
  }

  return (
    <motion.div
      aria-hidden="true"
      className={cn("rounded-lg bg-paper-dim", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, hsl(var(--line) / 0.6) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
      animate={{ backgroundPosition: ["150% 0%", "-50% 0%"] }}
      transition={{ duration: 1.4, ease: "linear", repeat: Infinity }}
    />
  );
}
