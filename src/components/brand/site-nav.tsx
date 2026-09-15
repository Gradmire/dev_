"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  Compass,
  Calculator,
  Scale,
  CalendarClock,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { TOOLS, COMPANY_LINKS } from "@/config/site";
import { createClient } from "@/lib/supabase/client";
import type { Navigation } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { Cta } from "@/components/ui/cta";

/**
 * The interactive half of the header. Nav content arrives as props from the
 * server component so this stays free of any hardcoded destination or
 * course list — see `@/lib/nav`.
 */

/** Config carries icon *names* so it stays serialisable; resolve them here. */
const TOOL_ICONS: Record<string, LucideIcon> = {
  Compass,
  Calculator,
  Scale,
  CalendarClock,
};

const triggerCls =
  "group flex items-center gap-1 rounded-pill px-3 py-2 text-[14.5px] font-medium text-ink outline-none transition-colors hover:text-sky-text data-[state=open]:text-sky-text";

/**
 * Whether someone is signed in, resolved in the browser.
 *
 * The server deliberately does not read the auth cookie to render the chrome.
 * Doing so made every page carrying a header per-user, which opted the
 * homepage out of static rendering entirely — it was the only route on the
 * site that missed the CDN cache. Starting at `false` means a signed-in
 * visitor sees "Sign in" for a moment before it swaps, which is a cosmetic
 * cost for a page that now serves from the edge.
 *
 * This gates a label, not access: /portal and /admin are enforced in the
 * middleware and again on the server.
 */
function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    // Reads the cached session locally — no request to Supabase.
    void supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
    });

    // Keeps the label honest when the user signs out in another tab.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return signedIn;
}

function Chevron() {
  return (
    <ChevronDown
      size={14}
      aria-hidden="true"
      className="transition-transform group-data-[state=open]:rotate-180"
    />
  );
}

/** A menu whose items are all coming-soon renders as a plain link instead. */
function NavMenu({
  label,
  fallbackHref,
  hasItems,
  children,
}: {
  label: string;
  fallbackHref: string;
  hasItems: boolean;
  children: React.ReactNode;
}) {
  if (!hasItems) {
    return (
      <Link
        href={fallbackHref}
        className="rounded-pill px-3 py-2 text-[14.5px] font-medium text-ink transition-colors hover:text-sky-text"
      >
        {label}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerCls}>
        {label}
        <Chevron />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SiteNav({
  nav,
  primaryDestination,
}: {
  nav: Navigation;
  /** Where "Destinations" and "Courses" point when their menus are empty. */
  primaryDestination: string;
}) {
  const [open, setOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const signedIn = useSignedIn();

  function toggleMobileSection(label: string) {
    setMobileSection((current) => (current === label ? null : label));
  }

  const destinationsHref = `/${primaryDestination}`;
  const coursesHref = `/${primaryDestination}#courses`;

  // The header is opaque on purpose. It used to be translucent over a
  // blurred backdrop, and a full-width sticky backdrop filter makes the
  // browser re-blur the strip behind it on every scroll frame — the largest
  // single cause of scroll jank here. At 90% opacity it was barely visible.
  // (Written without the utility name so Tailwind stops emitting the class.)
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper">
      <Container className="gutter mx-auto flex items-center justify-between gap-3 py-4">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Gradmire — home">
          {/* The mark is wider than the wordmark it replaced, so it steps down
              on the narrowest screens to keep the CTA and the menu button on
              the same row at 360px. */}
          <Logo className="h-[23px] sm:h-[26px]" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1.5 lg:flex">
          <NavMenu
            label="Destinations"
            fallbackHref={destinationsHref}
            hasItems={nav.destinations.length > 0}
          >
            {nav.destinations.map((d) =>
              d.live ? (
                <DropdownMenuItem key={d.slug} asChild>
                  <Link href={`/${d.slug}`}>
                    {d.flagEmoji && (
                      <span aria-hidden="true" className="text-lg leading-none">
                        {d.flagEmoji}
                      </span>
                    )}
                    <span className="flex-1">
                      <span className="block font-medium text-ink">{d.name}</span>
                      {d.detail && (
                        <span className="block text-[12px] text-ink-soft">{d.detail}</span>
                      )}
                    </span>
                    <span className="mt-0.5 rounded-pill bg-brandgreen-dim px-2 py-0.5 font-mono text-micro uppercase tracking-wider text-ink">
                      Live
                    </span>
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={d.slug} disabled>
                  {d.flagEmoji && (
                    <span aria-hidden="true" className="text-lg leading-none opacity-60">
                      {d.flagEmoji}
                    </span>
                  )}
                  <span className="flex-1">
                    <span className="block font-medium text-ink-soft">{d.name}</span>
                    {d.detail && (
                      <span className="block text-[12px] text-ink-soft/70">{d.detail}</span>
                    )}
                  </span>
                  <span className="mt-0.5 rounded-pill bg-paper-dim px-2 py-0.5 font-mono text-micro uppercase tracking-wider text-ink-soft">
                    Soon
                  </span>
                </DropdownMenuItem>
              ),
            )}
          </NavMenu>

          <NavMenu
            label="Courses"
            fallbackHref={coursesHref}
            hasItems={nav.hubs.length > 0}
          >
            {nav.hubs.map((hub) =>
              hub.live ? (
                <DropdownMenuItem key={hub.slug} asChild>
                  <Link href={hub.href}>
                    <span className="flex-1">
                      <span className="block font-medium text-ink">{hub.name}</span>
                      {hub.tuition && (
                        <span className="block text-[12px] text-ink-soft">{hub.tuition}</span>
                      )}
                    </span>
                    <ArrowRight
                      size={13}
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-ink-soft"
                    />
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={hub.slug} disabled>
                  <span className="flex-1">
                    <span className="block font-medium text-ink-soft">{hub.name}</span>
                    <span className="block text-[12px] text-ink-soft/70">In research</span>
                  </span>
                </DropdownMenuItem>
              ),
            )}
          </NavMenu>

          <NavMenu label="Tools" fallbackHref={TOOLS[0].href} hasItems>
            {TOOLS.map((tool) => {
              const Icon = TOOL_ICONS[tool.icon] ?? BookOpen;
              return (
                <DropdownMenuItem key={tool.href} asChild>
                  <Link href={tool.href}>
                    <Icon
                      size={17}
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-sky-text"
                    />
                    <span className="flex-1">
                      <span className="block font-medium text-ink">{tool.label}</span>
                      <span className="block text-[12px] text-ink-soft">
                        {tool.description}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </NavMenu>

          <Link
            href="/about"
            className="rounded-pill px-3 py-2 text-[14.5px] font-medium text-ink transition-colors hover:text-sky-text"
          >
            About
          </Link>
          <Link
            href="/faq"
            className="rounded-pill px-3 py-2 text-[14.5px] font-medium text-ink transition-colors hover:text-sky-text"
          >
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={signedIn ? "/portal" : "/login"}
            className="hidden rounded-pill px-4 py-2.5 text-ui font-medium text-ink transition-colors hover:text-sky-text sm:inline-flex"
          >
            {signedIn ? "My applications" : "Sign in"}
          </Link>
          {/* The full label does not fit beside the logo and the menu button
              on a 360px screen, so the phone gets the short form. */}
          <Cta href="/contact" size="md" className="shrink-0">
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">Book consultation</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Cta>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink transition-colors hover:bg-paper-dim lg:hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "close" : "open"}
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 45 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="flex"
              >
                {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>
      </Container>

      {/*
        Animating `height` between 0 and "auto" — framer-motion measures the
        content and tweens to it, so the panel doesn't jump the way a plain
        CSS `height: auto` would, and doesn't reflow the page on every frame
        the way animating a fixed pixel height guessed in advance would.
      */}
      <motion.div
        id="mobile-nav"
        initial={false}
        animate={{ height: open ? "auto" : 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(
          "overflow-hidden border-line bg-paper lg:hidden",
          open && "border-t",
        )}
      >
        {/*
          The panel stays mounted (just measured to zero height) so `inert`
          can take its links out of the tab order and the a11y tree — the job
          the `hidden` attribute used to do — without the header/footer
          shifting or the toggle button's `aria-controls` pointing at nothing.
        */}
        <nav
          aria-label="Mobile"
          inert={!open}
          className={cn(
            "gutter flex min-h-0 flex-col",
            open ? "pb-6 pt-2" : "py-0",
          )}
        >
          {nav.destinations.length > 0 && (
            <MobileSection
              label="Destinations"
              expanded={mobileSection === "Destinations"}
              onToggle={() => toggleMobileSection("Destinations")}
            >
              {nav.destinations.map((d) =>
                d.live ? (
                  <Link
                    key={d.slug}
                    href={`/${d.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 py-3 text-ui text-ink"
                  >
                    {d.flagEmoji && <span aria-hidden="true">{d.flagEmoji}</span>}
                    {d.name}
                    <span className="ml-auto font-mono text-micro uppercase tracking-wider text-ink-soft">
                      Live
                    </span>
                  </Link>
                ) : (
                  <span
                    key={d.slug}
                    className="flex items-center gap-2.5 py-3 text-ui text-ink-soft"
                  >
                    {d.flagEmoji && (
                      <span aria-hidden="true" className="opacity-60">
                        {d.flagEmoji}
                      </span>
                    )}
                    {d.name}
                    <span className="ml-auto font-mono text-micro uppercase tracking-wider">
                      Soon
                    </span>
                  </span>
                ),
              )}
            </MobileSection>
          )}

          {nav.hubs.length > 0 && (
            <MobileSection
              label="Courses"
              expanded={mobileSection === "Courses"}
              onToggle={() => toggleMobileSection("Courses")}
            >
              {nav.hubs.map((hub) =>
                hub.live ? (
                  <Link
                    key={hub.slug}
                    href={hub.href}
                    onClick={() => setOpen(false)}
                    className="block py-3 text-ui text-ink"
                  >
                    {hub.name}
                  </Link>
                ) : (
                  <span key={hub.slug} className="block py-3 text-ui text-ink-soft">
                    {hub.name}{" "}
                    <span className="font-mono text-micro uppercase tracking-wider">
                      In research
                    </span>
                  </span>
                ),
              )}
            </MobileSection>
          )}

          <MobileSection
            label="Tools"
            expanded={mobileSection === "Tools"}
            onToggle={() => toggleMobileSection("Tools")}
          >
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => setOpen(false)}
                className="block py-3 text-ui text-ink"
              >
                {tool.label}
              </Link>
            ))}
          </MobileSection>

          {COMPANY_LINKS.filter((l) => l.href !== "/contact").map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="border-b border-line/60 py-3.5 text-lede font-medium text-ink"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={signedIn ? "/portal" : "/login"}
            onClick={() => setOpen(false)}
            className="py-3.5 text-lede font-medium text-sky-text"
          >
            {signedIn ? "My applications" : "Sign in"}
          </Link>
        </nav>
      </motion.div>
    </header>
  );
}

function MobileSection({
  label,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-line/60">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between py-3.5 text-lede font-medium text-ink"
      >
        {label}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn(
            "transition-transform duration-200 ease-out",
            expanded && "rotate-180",
          )}
        />
      </button>
      {/* Same auto-height reveal as the panel above, for the same reasons. */}
      <motion.div
        initial={false}
        animate={{ height: expanded ? "auto" : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="overflow-hidden"
      >
        <div inert={!expanded} className="min-h-0 pb-3 pl-1">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
