"use client";

import { Children, isValidElement } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * Scroll-triggered entrance animation for a section, or for a grid's tiles in
 * sequence.
 *
 * Deliberately scroll-only, and deliberately not used on the hero — see
 * `hero-reveal.tsx` for why the hero needs a different, LCP-safe approach.
 *
 * `initial`/`whileInView` render an inline `opacity: 0` style straight into
 * the server HTML, so a visitor without JavaScript would never see these
 * sections. `data-motion` flags every element that does this; the root
 * layout ships one `<noscript>` stylesheet that forces `data-motion`
 * elements back to full opacity when scripting is off, rather than gating
 * the hidden state behind a `.js` class the way the previous anime.js
 * version did.
 */

/** px of upward travel. Small: this is punctuation, not a transition. */
const DISTANCE = 18;
const DURATION = 0.4;
const EASE = "easeOut";
/** Fires once a section is ~72px from entering the viewport, not on the dot. */
const VIEWPORT = { once: true, margin: "0px 0px -72px 0px" } as const;

const item: Variants = {
  hidden: { opacity: 0, y: DISTANCE },
  visible: { opacity: 1, y: 0 },
};

type Props = {
  children: React.ReactNode;
  className?: string;
  /**
   * Move the direct children in sequence instead of the wrapper as one block.
   *
   * Each child is wrapped in an element of its own to carry the stagger. When
   * `as` is a list that wrapper is the <li>, so children should be the item
   * *contents* — a keyed Fragment, not a nested <li>.
   */
  group?: boolean;
  /** ms between children. Ignored unless `group`. */
  step?: number;
  /** ms before the first element moves. */
  delay?: number;
  as?: "div" | "ol" | "ul";
};

export function Reveal({
  children,
  className,
  group = false,
  step = 70,
  delay = 0,
  as = "div",
}: Props) {
  const shouldReduceMotion = useReducedMotion();
  const Tag = motion[as];

  /*
   * The per-child wrapper has to be a valid child of `as`. Staggering a grid
   * rendered as <ol> was wrapping every item in a <div>, producing
   * <ol><div><li>…</li></div></ol> — which axe flags twice over (a list with
   * non-<li> children, and list items with no list parent) and which drops
   * the group from the accessibility tree as a list at all, so a screen
   * reader never announces "list, 4 items".
   */
  const Item = as === "div" ? motion.div : motion.li;

  if (!group) {
    return (
      <Tag
        data-motion
        className={className}
        initial={shouldReduceMotion ? false : "hidden"}
        whileInView="visible"
        viewport={VIEWPORT}
        variants={item}
        transition={{ duration: DURATION, ease: EASE, delay: delay / 1000 }}
      >
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      className={className}
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={VIEWPORT}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: shouldReduceMotion ? 0 : step / 1000,
            delayChildren: delay / 1000,
          },
        },
      }}
    >
      {Children.map(children, (child, i) => (
        <Item
          // Real elements keep their own key so list reordering stays stable;
          // fragments/text fall back to index, matching Children.map's own default.
          key={isValidElement(child) && child.key !== null ? child.key : i}
          data-motion
          variants={item}
          transition={{ duration: DURATION, ease: EASE }}
        >
          {child}
        </Item>
      ))}
    </Tag>
  );
}
