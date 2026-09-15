import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { Container } from "@/components/ui/container";
import { UnsubscribeButton } from "@/components/consent/unsubscribe-button";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

/**
 * Withdrawing marketing consent, without a sign-in.
 *
 * Nobody needs an account to subscribe from the site footer, so nobody should
 * need one to leave — s.6(4) requires withdrawal to be as easy as giving
 * consent was, and "create an account first" is not that.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main id="main" className="gutter py-20">
        <Container className="max-w-[52ch] text-center">
          {token ? (
            <>
              <span className="eyebrow justify-center">Deadline reminders</span>
              <h1 className="mb-4 mt-3 text-[clamp(26px,3.4vw,34px)] font-semibold">
                Stop these emails?
              </h1>
              <p className="mb-8 text-lede text-ink-soft">
                One click and we&rsquo;ll stop sending deadline reminders and course
                updates. Nothing else changes.
              </p>
              <div className="flex justify-center">
                <UnsubscribeButton token={token} />
              </div>
            </>
          ) : (
            <>
              <h1 className="mb-4 text-[clamp(26px,3.4vw,34px)] font-semibold">
                Unsubscribe
              </h1>
              <p className="text-lede text-ink-soft">
                Use the unsubscribe link at the bottom of any email we&rsquo;ve sent
                you. If you have an account, you can also turn these off in your{" "}
                <Link href="/account/consent" className="underline hover:text-ink">
                  consent settings
                </Link>
                .
              </p>
            </>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
