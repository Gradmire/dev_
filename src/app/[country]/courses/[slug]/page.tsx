import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, AlertTriangle } from "lucide-react";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { getCourseHub, getAllHubPaths, formatRange } from "@/lib/queries";
import { isDatabaseConfigured } from "@/db";
import { Container } from "@/components/ui/container";
import { Cta } from "@/components/ui/cta";
import { routeMetadata } from "@/lib/metadata";

// Next requires route segment config to be a literal it can statically
// extract, so this cannot reference CONTENT_REVALIDATE_SECONDS directly.
// Keep it equal to that constant in @/config/site.
export const revalidate = 3600;

export async function generateStaticParams() {
  if (!isDatabaseConfigured()) return [];
  const paths = await getAllHubPaths();
  return paths.map((p) => ({ country: p.destination, slug: p.hub }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; slug: string }>;
}): Promise<Metadata> {
  const { country, slug } = await params;
  const hub = await getCourseHub(country, slug);
  if (!hub) return {};

  const tuition = formatRange(hub.tuitionMin, hub.tuitionMax, hub.currency, {
    suffix: "/year",
  });
  return routeMetadata({
    path: `/${country}/courses/${slug}`,
    title: `${hub.name} in the ${hub.destination.name}`,
    description:
      hub.oneLiner ??
      `${hub.name} master's courses in the ${hub.destination.name}${tuition ? ` — tuition ${tuition}` : ""}.`,
    noIndex: hub.status === "stub",
  });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-card">
      <span className="mb-2 block font-mono text-mini uppercase tracking-[0.07em] text-ink-soft">
        {label}
      </span>
      <span className="font-display text-h4 font-semibold">{value}</span>
    </div>
  );
}

export default async function CourseHubPage({
  params,
}: {
  params: Promise<{ country: string; slug: string }>;
}) {
  const { country, slug } = await params;
  const hub = await getCourseHub(country, slug);
  if (!hub) notFound();

  const tuition = formatRange(hub.tuitionMin, hub.tuitionMax, hub.currency, {
    compact: true,
  });
  const living = formatRange(hub.livingCostMin, hub.livingCostMax, hub.currency, {
    compact: true,
    suffix: "/mo",
  });
  const salary = formatRange(hub.salaryMin, hub.salaryMax, hub.currency, {
    compact: true,
  });
  const ielts =
    hub.ieltsMin && hub.ieltsMax && hub.ieltsMin !== hub.ieltsMax
      ? `${hub.ieltsMin}–${hub.ieltsMax}`
      : hub.ieltsMin ?? null;

  const atasLabel =
    hub.atasRequirement === "no"
      ? "No"
      : hub.atasRequirement === "yes"
        ? "Yes"
        : "Per course";

  if (hub.status === "stub") {
    return (
      <>
        <SiteHeader />
        <main id="main" className="gutter py-24">
          <div className="mx-auto max-w-[52ch] text-center">
            <span className="eyebrow justify-center">Guide in research</span>
            <h1 className="mb-4 mt-3 text-h2">
              {hub.name}
            </h1>
            <p className="mb-8 text-lede text-ink-soft">
              {hub.oneLiner} We&rsquo;re still verifying rankings, fees and deadlines
              for this subject — we publish a hub only once the figures are sourced.
            </p>
            <Cta href="/contact">
              Talk to me anyway
              <ArrowRight size={15} aria-hidden="true" />
            </Cta>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Boarding-pass stub breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="border-b border-dashed border-line gutter py-5"
        >
          <ol className="mx-auto flex max-w-[1180px] items-center gap-2.5 font-mono text-meta uppercase tracking-[0.06em] text-ink-soft">
            <li><Link href="/" className="hover:text-ink">Gradmire</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link href={`/${country}`} className="hover:text-ink">{hub.destination.stampLabel}</Link></li>
            <li aria-hidden="true">/</li>
            <li className="text-ink">{hub.name}</li>
          </ol>
        </nav>

        <section className="gutter pb-11 pt-12">
          <Container className="mx-auto grid items-end gap-11 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <span className="eyebrow">Course hub · {hub.code}</span>
              <h1 className="my-4 text-h2">
                {hub.name} in the {hub.destination.name}
              </h1>
              <p className="max-w-[56ch] text-lede text-ink-soft">{hub.oneLiner}</p>
            </div>

            <dl className="rounded-2xl bg-ink p-6 font-mono text-white">
              {[
                ["Tuition", tuition ? `${tuition}/yr` : "—"],
                ["Living costs", living ?? "—"],
                ["IELTS", ielts ?? "—"],
                ["Post-study visa", `${hub.graduateRouteYears} yrs Graduate Route`],
                ["ATAS required", atasLabel],
              ].map(([label, value], i, arr) => (
                <div
                  key={label}
                  className={`flex items-center justify-between gap-4 py-2.5 text-meta ${
                    i < arr.length - 1 ? "border-b border-dashed border-white/15" : ""
                  }`}
                >
                  <dt className="text-white/70">{label}</dt>
                  <dd className="font-semibold text-sky">{value}</dd>
                </div>
              ))}
            </dl>
          </Container>
        </section>

        {hub.overview && (
          <section className="gutter pb-4">
            <Container>
              <p className="max-w-[68ch] text-lede leading-relaxed text-ink-soft">
                {hub.overview}
              </p>
            </Container>
          </section>
        )}

        {/* Universities */}
        {hub.universities.length > 0 && (
          <section className="gutter py-11">
            <Container>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <h2 className="text-h3">
                  Top universities for {hub.name}
                </h2>
                <span className="font-mono text-meta uppercase tracking-wide text-ink-soft">
                  Subject-ranked, not overall rank
                </span>
              </div>
              {/* tabIndex: the only way to scroll this region by keyboard. */}
              <div
                tabIndex={0}
                role="region"
                aria-label={`Top universities for ${hub.name}`}
                className="scroll-x-hint overflow-x-auto rounded-2xl border border-line"
              >
                <table className="w-full min-w-[560px] border-collapse text-ui">
                  <thead>
                    <tr>
                      {["University", "Notable for", "Subject rank (UK)"].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="border-b border-ink bg-white px-4 py-3 text-left font-mono text-mini font-medium uppercase tracking-[0.08em] text-ink-soft"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hub.universities.map((u) => (
                      <tr key={u.id} className="bg-white hover:bg-paper-dim">
                        <td className="border-b border-line px-4 py-3.5 font-semibold">
                          {u.name}
                        </td>
                        <td className="border-b border-line px-4 py-3.5 text-ink-soft">
                          {u.notableFor}
                        </td>
                        <td className="border-b border-line px-4 py-3.5">
                          {u.subjectRank && (
                            <span className="rounded-pill bg-sky-dim px-2.5 py-1 font-mono text-mini font-semibold text-sky-text">
                              {u.subjectRank}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hub.sources && hub.sources.length > 0 && (
                <p className="mt-3 font-mono text-mini uppercase tracking-wide text-ink-soft">
                  {hub.sources[0].label}
                </p>
              )}
            </Container>
          </section>
        )}

        {/* Fees & entry */}
        <section className="gutter py-11">
          <Container>
            <h2 className="mb-6 text-h3">Fees &amp; entry requirements</h2>
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {tuition && <Stat label="Tuition" value={tuition} />}
                {living && <Stat label="Living costs" value={living} />}
              </div>
              {hub.entryRequirements && hub.entryRequirements.length > 0 && (
                <ul>
                  {hub.entryRequirements.map((req) => (
                    <li
                      key={req}
                      className="border-b border-line py-3 text-ui text-ink"
                    >
                      {req}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {hub.deadlines.length > 0 && (
              <div className="mt-8 space-y-3">
                {hub.deadlines.map((d) => (
                  <div key={d.id}>
                    <div className="flex items-start gap-3.5 rounded-2xl bg-sky px-5 py-4 text-ui font-semibold text-ink">
                      <CalendarDays size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                      <span>
                        {d.label}: {d.detail}
                      </span>
                    </div>
                    {d.warning && (
                      <p className="mt-2 flex items-start gap-2 rounded-lg border-l-[3px] border-sky bg-sky-dim px-4 py-3 text-body text-ink">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-sky-text" aria-hidden="true" />
                        {d.warning}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Container>
        </section>

        {/* Careers */}
        <section className="gutter py-11">
          <Container>
            <div className="rounded-3xl bg-ink p-9 text-white">
              <h2 className="text-h3 text-white">Career outcomes</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {salary && (
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
                    <span className="mb-2 block font-mono text-mini uppercase tracking-[0.07em] text-white/60">
                      Starting salary
                    </span>
                    <span className="font-display text-h4 font-semibold">{salary}</span>
                  </div>
                )}
                {hub.topSectors && hub.topSectors.length > 0 && (
                  <div className="rounded-2xl border border-white/15 bg-white/5 p-5 sm:col-span-1 lg:col-span-3">
                    <span className="mb-2 block font-mono text-mini uppercase tracking-[0.07em] text-white/60">
                      Top hiring sectors
                    </span>
                    <span className="font-display text-lede">
                      {hub.topSectors.join(" · ")}
                    </span>
                  </div>
                )}
              </div>

              {hub.commonEmployers && hub.commonEmployers.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2.5">
                  {hub.commonEmployers.map((e) => (
                    <li
                      key={e}
                      className="rounded-pill bg-white/10 px-3.5 py-2 font-mono text-meta"
                    >
                      {e}
                    </li>
                  ))}
                </ul>
              )}

              {hub.visaNotes && hub.visaNotes.length > 0 && (
                <ul className="mt-6 space-y-2">
                  {hub.visaNotes.map((n) => (
                    <li
                      key={n}
                      className="rounded-r-lg border-l-[3px] border-sky bg-white/10 px-4 py-3 text-ui"
                    >
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="gutter pb-20 pt-4">
          <Container>
            <div className="rounded-3xl bg-brandgreen p-10 text-center text-white">
              <h2 className="mb-2.5 text-h2 text-white">
                Get a shortlist for {hub.name}
              </h2>
              <p className="mx-auto mb-6 max-w-[46ch] text-lede text-white/85">
                Free 20-minute consultation with me — I focus on this subject.
              </p>
              <Cta href={`/contact?course=${hub.slug}`} variant="onDark">
                Book free consultation
                <ArrowRight size={15} aria-hidden="true" />
              </Cta>
            </div>
          </Container>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
