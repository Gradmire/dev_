import type { Metadata } from "next";
import Link from "next/link";
import { Scale } from "lucide-react";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { Container } from "@/components/ui/container";
import { GrievanceForm } from "@/components/rights/grievance-form";
import { GRIEVANCE_OFFICER, RIGHTS_SLA } from "@/config/site";
import { getSessionUser } from "@/lib/supabase/server";
import { routeMetadata } from "@/lib/metadata";

export const metadata: Metadata = routeMetadata({
  path: "/grievance",
  title: "Raise a grievance",
  description:
    "Complain about how Gradmire has handled your personal data. Our Grievance Officer responds within 30 days, and you can escalate to the Data Protection Board of India.",
});

export const dynamic = "force-dynamic";

/**
 * Grievance redressal (DPDP s.13).
 *
 * Open to everyone, signed in or not. Someone whose only footprint is a lead
 * row has the same right to complain as an account holder, and a login wall
 * here would put the complaints channel furthest from the people most likely
 * to need it. Signing in only pre-fills the address.
 */
export default async function GrievancePage() {
  const user = await getSessionUser();

  return (
    <>
      <SiteHeader />
      <main id="main" className="gutter py-16">
        <Container className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <span className="eyebrow">Grievance redressal</span>
            <h1 className="mb-4 mt-3 text-[clamp(28px,3.8vw,42px)] font-semibold leading-[1.1]">
              Something wrong with how we handled your data?
            </h1>
            <p className="mb-8 max-w-[46ch] text-lede text-ink-soft">
              Tell our Grievance Officer. This is the formal channel under the
              Digital Personal Data Protection Act, and every complaint gets a
              reference you can quote.
            </p>

            <dl className="space-y-5 border-t border-line pt-7">
              <div>
                <dt className="font-mono text-mini uppercase tracking-[0.1em] text-sky-text">
                  Grievance Officer
                </dt>
                <dd className="mt-1.5 text-ui text-ink-soft">
                  {GRIEVANCE_OFFICER.name} —{" "}
                  <a
                    href={`mailto:${GRIEVANCE_OFFICER.email}`}
                    className="underline hover:text-ink"
                  >
                    {GRIEVANCE_OFFICER.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-mono text-mini uppercase tracking-[0.1em] text-sky-text">
                  Our response time
                </dt>
                <dd className="mt-1.5 max-w-[44ch] text-ui text-ink-soft">
                  Within {RIGHTS_SLA.grievanceDays} days of you submitting it. We
                  stamp the deadline on your grievance when it&rsquo;s logged, so it
                  can&rsquo;t move afterwards.
                </dd>
              </div>
              <div>
                <dt className="font-mono text-mini uppercase tracking-[0.1em] text-sky-text">
                  If you&rsquo;re still not satisfied
                </dt>
                <dd className="mt-1.5 max-w-[44ch] text-ui text-ink-soft">
                  You can escalate to the Data Protection Board of India. You
                  don&rsquo;t need our permission, and you don&rsquo;t have to wait
                  for us to finish — though having our answer usually helps.
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex items-start gap-2.5 rounded-2xl border border-line bg-paper-dim p-4">
              <Scale size={16} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden="true" />
              <p className="text-meta text-ink-soft">
                Just want to fix or delete something? That&rsquo;s faster in your{" "}
                <Link href="/account/data" className="underline hover:text-ink">
                  data settings
                </Link>{" "}
                — no complaint needed.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <GrievanceForm defaultEmail={user?.email ?? undefined} />
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
