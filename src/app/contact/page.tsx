import type { Metadata } from "next";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { ConsultationForm } from "@/components/forms/consultation-form";
import { getCourseHubs } from "@/lib/queries";
import { optionalContent } from "@/lib/safe-query";
import { PRIMARY_DESTINATION } from "@/config/site";
import { Container } from "@/components/ui/container";
import { routeMetadata } from "@/lib/metadata";

export const metadata: Metadata = routeMetadata({
  path: "/contact",
  title: "Book a free consultation",
  description:
    "Book a free 20-minute consultation with a Gradmire counselor who specializes in your subject area.",
});

// Next requires route segment config to be a literal it can statically
// extract, so this cannot reference CONTENT_REVALIDATE_SECONDS directly.
// Keep it equal to that constant in @/config/site.
export const revalidate = 3600;

export default async function ContactPage() {
  // The form is the point of this page, and it submits fine without a course
  // pre-selected — so a database outage must not take the page down with it.
  const hubs = await optionalContent(
    "contact course list",
    () => getCourseHubs(PRIMARY_DESTINATION),
    [],
  );
  const courses = hubs.map((h) => ({ slug: h.slug, name: h.name }));

  return (
    <>
      <SiteHeader />
      <main id="main" className="gutter py-16">
        <Container className="mx-auto grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="eyebrow">Talk to a counselor</span>
            <h1 className="mb-4 mt-3 text-[clamp(30px,4vw,46px)] font-semibold leading-[1.08]">
              Let&rsquo;s find your course.
            </h1>
            <p className="mb-8 max-w-[44ch] text-[16px] text-ink-soft">
              Book a free 20-minute consultation with a counselor who specializes in
              your subject area — not a generalist working from a country brochure.
            </p>

            <dl className="space-y-5 border-t border-line pt-7">
              {[
                ["Subject specialists", "Counselors are assigned by discipline, so the advice comes from someone who knows your field."],
                ["Shortlist to visa", "We stay with you through SOPs, offers, CAS and the visa itself — not just the application."],
                ["No cost to you", "Our consultations are free. We're paid by partner universities once you enrol."],
              ].map(([term, def]) => (
                <div key={term}>
                  <dt className="font-mono text-mini uppercase tracking-[0.1em] text-sky-text">
                    {term}
                  </dt>
                  <dd className="mt-1.5 max-w-[44ch] text-ui text-ink-soft">{def}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-3xl border border-line bg-paper-dim p-7 sm:p-9">
            <ConsultationForm courses={courses} />
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
