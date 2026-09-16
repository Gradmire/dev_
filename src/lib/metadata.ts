import type { Metadata } from "next";

/**
 * Builds a page's title, description, canonical and OpenGraph metadata
 * together.
 *
 * Next only inherits a nested metadata object (like `openGraph`) from a
 * parent segment when the child doesn't declare that key at all — if a page
 * sets `openGraph` it replaces the parent's wholesale, it does not merge
 * field-by-field. So every page that wants its own `og:url`/`og:title`/
 * `og:description` must restate `type`/`siteName` too, or lose them. This
 * keeps that restatement in one place instead of copy-pasted per route.
 */
export function routeMetadata({
  path,
  title,
  description,
  noIndex = false,
}: {
  path: string;
  title: string;
  description: string;
  noIndex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Gradmire",
      url: path,
      title,
      description,
    },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}
