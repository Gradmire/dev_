"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Mount-triggered stagger for the hero's headline/subtext/CTA. Unlike
 * `Reveal`, this fires immediately on load rather than on scroll — it's the
 * first thing a visitor sees, so it can't wait for an IntersectionObserver.
 *
 * The starting opacity is a floor, not zero: Chrome excludes an element
 * painted at `opacity: 0` from LCP candidacy, which would hand the page's
 * LCP to something smaller and less meaningful than the headline. Starting
 * partly visible keeps the headline LCP-eligible from first paint while
 * still reading as a fade-up. Same reasoning as `reveal.tsx`'s comment on
 * why the hero was skipped entirely before.
 */

const FLOOR_OPACITY = 0.4;
const DISTANCE = 14;
const DURATION = 0.35;
const STEP = 0.07;
const EASE = "easeOut";

const item = {
  hidden: { opacity: FLOOR_OPACITY, y: DISTANCE },
  visible: { opacity: 1, y: 0 },
};

export function HeroReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: shouldReduceMotion ? 0 : STEP },
        },
      }}
    >
      {Children.map(children, (child, i) => (
        <motion.div
          key={isValidElement(child) && child.key !== null ? child.key : i}
          data-motion
          variants={item}
          transition={{ duration: DURATION, ease: EASE }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
