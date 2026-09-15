import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The brand type scale shares the `text-` prefix with text colours, and
 * tailwind-merge can only tell them apart for sizes it already knows. Left
 * unregistered it reads `text-ui` as a colour, so `cn("text-paper", "text-ui")`
 * drops the colour and renders ink-on-ink. Keep this list in sync with
 * `fontSize` in tailwind.config.ts.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "micro", "mini", "meta", "body", "ui", "lede",
            "h1", "h2", "h3", "h4", "h5", "h6", "small",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
