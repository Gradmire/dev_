import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { Container } from "@/components/ui/container";
import { Cta } from "@/components/ui/cta";
import { GRIEVANCE_OFFICER } from "@/config/site";

export const metadata: Metadata = {
  title: "Your data has been deleted",
  robots: { index: false, follow: false },
};

/**
 * Where erasure lands. Outside `/account` because by this point there is no
 * session left to gate on — sending someone to a login screen to confirm
 * their account is gone would be a poor last impression, and an odd one.
 */
export default function AccountDeletedPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="gutter py-20">
        <Container className="max-w-[54ch] text-center">
          <CheckCircle2
            size={36}
            className="mx-auto mb-5 text-brandgreen"
            aria-hidden="true"
          />
          <h1 className="mb-4 text-[clamp(26px,3.4vw,36px)] font-semibold">
            Your data has been deleted
          </h1>
          <p className="mb-4 text-lede text-ink-soft">
            Your account, your enquiries and your newsletter subscription are gone
            from our systems, and your sign-in has been removed. This wasn&rsquo;t a
            deactivation — there is nothing left to switch back on.
          </p>
          <p className="mb-9 text-ui text-ink-soft">
            If you enrolled at a university through us, an anonymised financial
            record of that enrolment remains, along with a coded record that this
            deletion happened. Neither can be traced back to you. Both were listed
            before you confirmed, and the detail is in our{" "}
            <Link href="/privacy" className="underline hover:text-ink">
              privacy policy
            </Link>
            .
          </p>

          <Cta href="/" size="md">
            Back to Gradmire
          </Cta>

          <p className="mt-9 text-meta text-ink-soft">
            Questions about what was deleted? Write to{" "}
            <a href={`mailto:${GRIEVANCE_OFFICER.email}`} className="underline">
              {GRIEVANCE_OFFICER.email}
            </a>
            .
          </p>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
