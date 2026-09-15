import Link from "next/link";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { Container } from "@/components/ui/container";

/**
 * The account area: everything a data principal can do about their own data
 * without asking us first (DPDP ss.11–14).
 *
 * Deliberately one tab away from the portal rather than buried in it. A right
 * that takes four clicks to find is not much of a right, and s.6(4) sets the
 * standard explicitly for withdrawal — as easy as it was to give.
 */

const TABS = [
  { href: "/portal", label: "My applications" },
  { href: "/account/data", label: "My data" },
  { href: "/account/consent", label: "Consent" },
] as const;

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="gutter py-12 sm:py-14">
        <Container>
          <nav
            aria-label="Account"
            className="mb-9 flex flex-wrap gap-2 border-b border-line pb-4"
          >
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="rounded-pill px-3.5 py-2 text-ui font-medium text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          {children}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
