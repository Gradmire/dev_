"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * `next/image` wrapped in a shimmer that fades out once the image has
 * actually loaded, instead of a blank flash. The wrapper owns the
 * aspect-ratio/rounding so callers get a fixed box immediately — no layout
 * shift whether the shimmer or the photo is currently showing.
 */
export function ImageWithSkeleton({
  className,
  wrapperClassName,
  alt,
  ...props
}: ImageProps & { wrapperClassName?: string }) {
  const [loaded, setLoaded] = useState(false);
  // Starts false and is only ever flipped by the mount effect below, which
  // never runs without JavaScript. `RootLayout` wraps the whole app in
  // `<AnimatePresence initial={false}>` (for route-change transitions),
  // and that ambient context makes every descendant motion element skip
  // its own `initial` prop and render directly at `animate`'s value on
  // first paint — so `animate`'s opacity, not `initial`, is what a
  // no-JavaScript visitor actually gets. Gating the dip on `mounted` means
  // that first-paint value is always 1 regardless of whether it's the
  // `initial`- or `animate`-branch that ends up applying.
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      {/* `relative`: a positioned element, like the Skeleton above it, so
          it paints in DOM order (on top) — an unpositioned box otherwise
          paints *before* a positioned sibling regardless of source order,
          which was putting the Skeleton on top of the image forever. */}
      <motion.div
        className="relative"
        animate={{ opacity: mounted && !loaded ? 0 : 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: "easeOut" }}
      >
        <Image
          alt={alt}
          className={cn("h-full w-full object-cover", className)}
          onLoad={() => setLoaded(true)}
          {...props}
        />
      </motion.div>
    </div>
  );
}
