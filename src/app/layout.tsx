import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/config/site";
import { PageTransition } from "@/components/motion/page-transition";
import { cn } from "@/lib/utils";

/**
 * Three-typeface pairing: Fraunces for headings (the serif carries the
 * "boarding pass"/editorial feel the brand components already imply),
 * Inter for body copy, IBM Plex Mono for the eyebrow labels, board/pass
 * data cells and codes that `font-mono` is used for throughout the brand
 * components. `font-display`/`font-sans`/`font-mono` in tailwind.config.ts
 * point at these three variables.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Gradmire — Find your course. Then find the UK around it.",
    template: "%s | Gradmire",
  },
  description:
    "Study abroad organized by subject, not by country. Compare UK master's courses on fees, entry requirements, deadlines and graduate salaries — then get a shortlist built around your subject.",
  keywords: [
    "study abroad",
    "UK masters",
    "MSc UK fees",
    "Graduate Route visa",
    "UK university rankings by subject",
    "study in the UK from India",
  ],
  openGraph: {
    type: "website",
    siteName: "Gradmire",
    url: SITE_URL,
    title: "Gradmire — Find your course. Then find the UK around it.",
    description:
      "Study abroad organized by subject, not by country. Course-first shortlists for UK master's degrees.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#11446A" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn(fraunces.variable, inter.variable, plexMono.variable)}
    >
      <body className="min-h-screen font-sans">
        {/*
          framer-motion's `initial`/`whileInView` render as an inline
          `opacity: 0` style straight into the server HTML, so any element
          carrying `data-motion` would stay invisible forever for a visitor
          whose JavaScript never runs. `<noscript>` content only applies when
          scripting is off, so this stylesheet only ever overrides that case.
        */}
        <noscript>
          <style>{"[data-motion]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-pill focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-paper"
        >
          Skip to content
        </a>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
