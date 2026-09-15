import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        ink: {
          DEFAULT: "hsl(var(--ink))",
          2: "hsl(var(--ink-2))",
          3: "hsl(var(--ink-3))",
          soft: "hsl(var(--ink-soft))",
        },
        paper: {
          DEFAULT: "hsl(var(--paper))",
          dim: "hsl(var(--paper-dim))",
        },
        line: "hsl(var(--line))",
        navy: "hsl(var(--navy))",
        sky: {
          DEFAULT: "hsl(var(--sky))",
          text: "hsl(var(--sky-text))",
          dim: "hsl(var(--sky-dim))",
        },
        brandgreen: {
          DEFAULT: "hsl(var(--brand-green))",
          dim: "hsl(var(--brand-green-dim))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          "on-dark": "hsl(var(--warning-on-dark))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          "on-dark": "hsl(var(--success-on-dark))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /*
         * Neutral gray ramp, additive to the ink/paper/line brand tokens
         * above. Those three cover the site's actual surfaces; this ramp
         * exists for the in-between cases (disabled states, muted icons,
         * chart/data fills) that don't map cleanly onto "ink" or "paper".
         */
        neutral: {
          50: "hsl(var(--neutral-50))",
          100: "hsl(var(--neutral-100))",
          200: "hsl(var(--neutral-200))",
          300: "hsl(var(--neutral-300))",
          400: "hsl(var(--neutral-400))",
          500: "hsl(var(--neutral-500))",
          600: "hsl(var(--neutral-600))",
          700: "hsl(var(--neutral-700))",
          800: "hsl(var(--neutral-800))",
          900: "hsl(var(--neutral-900))",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      /*
       * micro/mini/meta/body/ui/lede: the de-facto small-text scale,
       * promoted from arbitrary values already in use across the app
       * (text-[13.5px] alone appeared 35 times). Deliberately named
       * outside Tailwind's own scale — redefining `sm`/`base` would
       * silently restyle every shadcn primitive that uses `text-sm`.
       *
       * h1-h6/small: the heading scale, additive to the above. Each maps
       * to the clamp()/px value already hand-written on that heading level
       * across page.tsx, [country]/page.tsx and [slug]/page.tsx, so
       * adopting these is a rename, not a redesign.
       */
      fontSize: {
        micro: "10px",
        mini: "11px",
        meta: "12.5px",
        body: "13.5px",
        ui: "14px",
        lede: "15px",
        h6: ["17px", { lineHeight: "1.3", letterSpacing: "-0.005em" }],
        h5: ["19px", { lineHeight: "1.25", letterSpacing: "-0.005em" }],
        h4: ["22px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        h3: [
          "clamp(26px, 3vw, 36px)",
          { lineHeight: "1.15", letterSpacing: "-0.01em" },
        ],
        h2: [
          "clamp(30px, 4vw, 44px)",
          { lineHeight: "1.08", letterSpacing: "-0.01em" },
        ],
        h1: [
          "clamp(34px, 4.6vw, 58px)",
          { lineHeight: "1.05", letterSpacing: "-0.01em" },
        ],
        small: ["13px", { lineHeight: "1.5", letterSpacing: "0" }],
      },
      boxShadow: {
        card: "0 1px 0 rgb(16 20 46 / 0.05), 0 12px 24px -16px rgb(16 20 46 / 0.25)",
        pass: "0 20px 40px -24px rgb(0 0 0 / 0.6)",
        board: "0 30px 60px -25px rgb(16 20 46 / 0.55)",
      },
      borderRadius: {
        pill: "999px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      /*
       * Motion vocabulary. Tailwind's default easing is a symmetric
       * ease-in-out, which makes hover states feel like they hesitate before
       * they start. Interface motion should leave immediately and settle
       * gently, so the default here is a decelerating curve and every
       * transition in the app inherits it without naming a class.
       */
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0, 0, 0.2, 1)",
      },
      transitionDuration: {
        // Hover, colour, focus — fast enough to feel instant.
        DEFAULT: "150ms",
        // Panels and disclosures, which move further and need to be followed.
        panel: "200ms",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config