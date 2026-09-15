"use client";

import { useState } from "react";
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
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn("relative overflow-hidden", wrapperClassName)}>
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      <motion.div
        initial={false}
        animate={{ opacity: loaded ? 1 : 0 }}
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
