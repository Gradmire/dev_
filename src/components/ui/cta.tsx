"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const MotionLink = motion(Link);

const TAP_TRANSITION = { duration: 0.15, ease: "easeOut" } as const;

/**
 * The pill call-to-action.
 *
 * `ui/button.tsx` exists but only the four interactive tools ever imported
 * it, so every marketing CTA was a hand-copied class string. They had already
 * drifted into four sizes and three different "secondary" treatments of what
 * is meant to be one button — including two files carrying byte-identical
 * strings for the same submit button.
 *
 * Sizes are the ones already in use, kept rather than re-invented: `lg` is
 * the hero and section CTA, `md` the header and error pages, `sm` the admin
 * action bar.
 */
const ctaVariants = cva(
  // whitespace-nowrap: a wrapped label turns the pill into a tall rounded box.
  // The header CTA did exactly that at 360px, overlapping the logo.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-semibold transition-colors disabled:opacity-70",
  {
    variants: {
      variant: {
        /** Default. Ink that lifts to brand navy. */
        primary: "bg-ink text-paper hover:bg-navy",
        /**
         * For when the CTA must win against a busy section.
         *
         * Filled with the bright sky and labelled in ink, not white: white on
         * #298DC6 is 3.67:1 and fails AA, while ink on it clears at 5.4:1.
         * The hover swaps to the darker sky cut, which does carry white.
         */
        accent: "bg-sky text-ink hover:bg-sky-text hover:text-white",
        /** Secondary next to a primary. */
        outline:
          "border-[1.5px] border-ink text-ink hover:bg-ink hover:text-paper",
        /** Secondary on a dark background, where a border would disappear. */
        onDark: "bg-white text-ink hover:bg-paper-dim",
      },
      size: {
        sm: "px-4 py-2 text-[13px]",
        md: "px-5 py-2.5 text-ui",
        lg: "px-6 py-3.5 text-lede",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "lg", block: false },
  },
);

type CtaProps = VariantProps<typeof ctaVariants> & { className?: string };

// framer-motion redefines onAnimationStart/onAnimationEnd (they take an
// animation definition, not a DOM AnimationEvent), so the native HTML
// attribute types must be stripped of them before reaching motion(...).
type MotionSafe<T> = Omit<
  T,
  "onAnimationStart" | "onAnimationEnd" | "onDrag" | "onDragStart" | "onDragEnd"
>;

/** Renders a link. Use `CtaButton` for a form submit. */
export function Cta({
  href,
  variant,
  size,
  block,
  className,
  children,
  ...rest
}: CtaProps &
  MotionSafe<Omit<React.ComponentProps<typeof Link>, "className">> & {
    href: string;
  }) {
  return (
    <MotionLink
      href={href}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={TAP_TRANSITION}
      className={cn(ctaVariants({ variant, size, block }), className)}
      {...rest}
    >
      {children}
    </MotionLink>
  );
}

/** The same shape as a real button, for form submits and client handlers. */
export function CtaButton({
  variant,
  size,
  block,
  className,
  children,
  type = "button",
  ...rest
}: CtaProps & MotionSafe<React.ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={TAP_TRANSITION}
      className={cn(ctaVariants({ variant, size, block }), className)}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export { ctaVariants };
