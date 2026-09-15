"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

/**
 * Counts a stat's leading figure up from zero when it scrolls into view.
 *
 * The stats are written as prose — "1 year", "4 of 10", "Direct" — so only a
 * leading run of digits is animated and everything after it is left alone. A
 * value with no leading figure renders as plain text and starts no animation.
 *
 * The server renders the *final* value, so the figure is correct for crawlers
 * and for a visitor without JavaScript; the reset to zero happens in a layout
 * effect, before paint, so the number never visibly snaps backwards.
 */

const LEADING_FIGURE = /^(\d+)(.*)$/;

const DURATION = 1.1;
const EASE = "easeOut";
// Same threshold as reveal.tsx's VIEWPORT.
const MARGIN = "0px 0px -72px 0px";

// Client components still render on the server, where `useLayoutEffect` warns.
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function CountUp({ value }: { value: string }) {
  const figureRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(figureRef, { once: true, margin: MARGIN });
  const shouldReduceMotion = useReducedMotion();

  useBeforePaint(() => {
    const el = figureRef.current;
    if (!el) return;
    if (!LEADING_FIGURE.test(value)) return;
    el.textContent = "0";
  }, [value]);

  useEffect(() => {
    const el = figureRef.current;
    if (!el || !inView) return;

    const match = LEADING_FIGURE.exec(value);
    if (!match) return;
    const [, figure] = match;

    if (shouldReduceMotion) {
      el.textContent = figure;
      return;
    }

    const controls = animate(0, Number(figure), {
      duration: DURATION,
      ease: EASE,
      onUpdate: (latest) => {
        el.textContent = String(Math.round(latest));
      },
      // Rounding during the tween can leave the last frame a digit short.
      onComplete: () => {
        el.textContent = figure;
      },
    });

    return () => {
      controls.stop();
      el.textContent = figure;
    };
  }, [inView, value, shouldReduceMotion]);

  const match = LEADING_FIGURE.exec(value);
  if (!match) return <>{value}</>;

  return (
    <>
      <span ref={figureRef}>{match[1]}</span>
      {match[2]}
    </>
  );
}
