import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowRight, SearchX } from "lucide-react";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { CoursePassCard } from "@/components/brand/course-pass-card";
import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/motion/count-up";
import { HeroReveal } from "@/components/motion/hero-reveal";
import { getDestinations, getCourseHubs } from "@/lib/queries";
import { optionalContent } from "@/lib/safe-query";
import { PRIMARY_DESTINATION, SITE_URL } from "@/config/site";
import { Container } from "@/components/ui/container";
import { Cta } from "@/components/ui/cta";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCardSkeleton } from "@/components/ui/course-card-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageWithSkeleton } from "@/components/ui/image-with-skeleton";

type CourseHub = Awaited<ReturnType<typeof getCourseHubs>>[number];

/**
 * Reads the same cache()-deduped hubs promise as `CourseGrid` below, but in
 * its own Suspense boundary so a slow DB read only blanks this one line —
 * not the hero CTA above it — while it resolves.
 */
async function HeroHubStat({ hubsPromise }: { hubsPromise: Promise<CourseHub[]> }) {
  const hubs = await hubsPromise;
  if (hubs.length === 0) return null;
  const liveHubCount = hubs.filter((h) => h.status === "live").length;
  return (
    <p className="text-body text-ink-soft">
      {liveHubCount} UK subject hubs live · {hubs.length - liveHubCount} in research
    </p>
  );
}

/**
 * Streams independently of the shell above it: the header, hero copy and
 * "Why the UK" grid paint immediately, and this grid (or its skeleton, or
 * the empty state) fills in once the hub read resolves.
 */
async function CourseGrid({ hubsPromise }: { hubsPromise: Promise<CourseHub[]> }) {
  const hubs = await hubsPromise;
  if (hubs.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        variant="onDark"
        title="No course hubs yet"
        description="We're still building out subject guides for this destination — check back soon."
      />
    );
  }
  return (
    <Reveal group step={55} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {hubs.map((hub) => (
        <CoursePassCard
          key={hub.id}
          code={hub.code}
          name={hub.name}
          description={hub.oneLiner}
          universityCount={hub.universityCount}
          isStub={hub.status === "stub"}
          href={`/${PRIMARY_DESTINATION}/courses/${hub.slug}`}
        />
      ))}
    </Reveal>
  );
}

function CourseGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Next requires route segment config to be a literal it can statically
// extract, so this cannot reference CONTENT_REVALIDATE_SECONDS directly.
// Keep it equal to that constant in @/config/site.
export const revalidate = 3600;

// Title/description are already correct via the root layout's defaults;
// the one thing every other top-level page has that this one was missing
// is its own canonical.
export const metadata: Metadata = {
  alternates: { canonical: SITE_URL },
};

const STEPS = [
  {
    title: "Tell us your interest",
    body: "Share your subject area, academic background, and career goals.",
  },
  {
    title: "Get your shortlist",
    body: "We match you to the strongest programmes and universities for your profile.",
  },
  {
    title: "Application support",
    body: "SOP reviews, interview prep, and document tracking, handled together.",
  },
  {
    title: "Visa guidance",
    body: "Step-by-step support through ATAS, CAS, and financial documentation.",
  },
];

const WHY_UK = [
  { stat: "1 year", label: "Master's degrees — a year less than the US or Canada" },
  { stat: "2 years", label: "Graduate Route post-study work visa (3 for PhD)" },
  { stat: "4 of 10", label: "Of the world's top ten universities" },
  { stat: "Direct", label: "Teaching-intensive courses with industry links" },
];

export default async function HomePage() {
  // Nothing here reads cookies or headers, which is what keeps this page
  // statically rendered and served from the CDN. `getSessionUser()` used to
  // sit in this list to tell the header whether to say "Sign in" or "My
  // applications"; that single cookie read made the whole route dynamic, and
  // it was the only page on the site that missed the cache. The header
  // resolves the session in the browser now — see `SiteNav`.
  // Both lists are supporting content: the page still sells without them, so
  // a database outage degrades the sections rather than serving a crash page.
  const destinations = await optionalContent(
    "homepage destinations",
    () => getDestinations(),
    [],
  );
  // Not awaited here on purpose: passed down to two independent Suspense
  // boundaries (hero stat line, course grid) so a slow read streams in
  // around the rest of the page instead of blocking it. React's `cache()`
  // wrapper on `getCourseHubs` means both boundaries share one DB call.
  const hubsPromise = optionalContent(
    "homepage course hubs",
    () => getCourseHubs(PRIMARY_DESTINATION),
    [],
  );

  return (
    <>
      <SiteHeader />

      <main id="main">
        {/* ---------- Hero ---------- */}
        <section className="hero-texture gutter pb-16 pt-20">
          <Container>
            <div className="max-w-[640px]">
              <HeroReveal>
                <span className="eyebrow">Study abroad, reordered</span>
                <h1 className="my-4 max-w-[15ch] text-h1">
                  Find your course. Then find{" "}
                  <em className="font-medium italic text-sky">the UK</em> around it.
                </h1>
                <p className="mb-8 max-w-[46ch] text-lede text-ink-soft">
                  Most platforms start with &ldquo;pick a country.&rdquo; We start with
                  what actually shapes your career — your subject. Get matched to
                  programmes first, then the universities and cities built around them.
                </p>
                <div className="mb-9 flex flex-wrap gap-3.5">
                  <Cta
                    href="#courses"
                    variant="accent"
                    className="shadow-[0_10px_22px_-10px_rgba(41,141,198,0.55)]"
                  >
                    Find my course
                    <ArrowRight size={15} aria-hidden="true" />
                  </Cta>
                  <Cta href="/tools/course-finder" variant="outline">
                    Take the quiz
                  </Cta>
                </div>
                <Suspense fallback={<Skeleton className="h-[19px] w-64" />}>
                  <HeroHubStat hubsPromise={hubsPromise} />
                </Suspense>
              </HeroReveal>
            </div>
          </Container>
        </section>

        {/* ---------- Why the UK ---------- */}
        <section className="gutter py-16">
          <Container>
            {/* Revealed as one block, not per tile: the grid's gaps are its
                own background showing through, so fading the tiles
                individually would flash a bare line-coloured slab. */}
            <Reveal className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
              {WHY_UK.map((item) => (
                <div key={item.stat} className="bg-paper p-6">
                  <p className="font-display text-[28px] font-semibold text-ink">
                    <CountUp value={item.stat} />
                  </p>
                  <p className="mt-1.5 text-body text-ink-soft">{item.label}</p>
                </div>
              ))}
            </Reveal>
          </Container>
        </section>

        {/* ---------- Destinations ---------- */}
        {destinations.length > 0 && (
        <section id="destinations" className="gutter py-20">
          <Container>
            <Reveal group className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="eyebrow">Study destinations</span>
                <h2 className="mt-2.5 max-w-[20ch] text-h3">
                  Where will you study?
                </h2>
              </div>
              <p className="max-w-[38ch] text-lede text-ink-soft">
                We&rsquo;re building the most comprehensive course-first platform, one
                destination at a time. The UK is live now.
              </p>
            </Reveal>

            <Reveal group className="grid gap-4.5 md:grid-cols-2 lg:grid-cols-[1.3fr_repeat(3,1fr)]">
              {destinations.map((d) =>
                d.status === "live" ? (
                  <Link
                    key={d.id}
                    href={`/${d.slug}`}
                    className="group relative flex min-h-72 flex-col justify-end overflow-hidden rounded-2xl p-6 text-white shadow-card"
                  >
                    <ImageWithSkeleton
                      src="https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=900&q=60"
                      alt={`${d.name} university lecture hall — placeholder, replace with real campus photography`}
                      fill
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      wrapperClassName="absolute inset-0"
                      className="transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-br from-ink via-navy/90 to-sky-text/80"
                    />
                    <span className="relative z-10 absolute right-5 top-5 flex h-16 w-16 rotate-[9deg] items-center justify-center rounded-full border-2 border-white/50 text-center font-mono text-[9.5px] uppercase leading-tight tracking-[0.06em] text-white/80">
                      {d.stampLabel}
                      <br />
                      Entry
                    </span>
                    <div className="relative z-10">
                      <div aria-hidden="true" className="mb-3.5 text-[30px]">
                        {d.flagEmoji}
                      </div>
                      <h3 className="mb-1.5 text-h4">{d.name}</h3>
                      <p className="max-w-[26ch] text-body opacity-85">
                        {d.tagline}. Live now.
                      </p>
                    </div>
                    <span className="relative z-10 mt-4 inline-flex items-center gap-2 text-body font-semibold">
                      Explore courses
                      <ArrowRight size={13} aria-hidden="true" />
                    </span>
                  </Link>
                ) : (
                  <div
                    key={d.id}
                    className="relative flex min-h-72 flex-col justify-between rounded-2xl border border-dashed border-line bg-paper-dim p-6 text-ink"
                  >
                    <span className="absolute right-5 top-5 flex h-16 w-16 -rotate-[8deg] items-center justify-center rounded-full border-2 border-ink-soft text-center font-mono text-[9.5px] uppercase leading-tight tracking-[0.06em] text-ink-soft">
                      {d.stampLabel}
                      <br />
                      Soon
                    </span>
                    <div>
                      <div aria-hidden="true" className="mb-3.5 text-[30px]">
                        {d.flagEmoji}
                      </div>
                      <h3 className="mb-1.5 text-h4">{d.name}</h3>
                      <p className="max-w-[26ch] text-body text-ink-soft">
                        {d.tagline}
                      </p>
                    </div>
                    <span className="mt-4 text-body font-medium text-ink-soft">
                      Coming soon
                    </span>
                  </div>
                ),
              )}
            </Reveal>
          </Container>
        </section>
        )}

        {/* ---------- Courses ---------- */}
        <section
          id="courses"
          className="bg-ink gutter py-20 text-paper [--perf-bg:var(--ink)]"
        >
          <Container>
            <Reveal group className="mb-10 flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="eyebrow !text-sky before:!bg-sky">
                  Browse by course
                </span>
                <h2 className="mt-2.5 max-w-[20ch] text-h3 text-white">
                  What do you want to study?
                </h2>
              </div>
              <p className="max-w-[38ch] text-lede text-paper/60">
                Every hub carries subject rankings, fees, deadlines and career outcomes.
              </p>
            </Reveal>

            <Suspense fallback={<CourseGridSkeleton />}>
              <CourseGrid hubsPromise={hubsPromise} />
            </Suspense>
          </Container>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="gutter py-20">
          <Container>
            <Reveal group className="mb-10">
              <span className="eyebrow">The journey</span>
              <h2 className="mt-2.5 max-w-[20ch] text-h3">
                Four stages, one boarding pass
              </h2>
            </Reveal>
            {/* Numbered because this is a real sequence — each stage depends on the last. */}
            <Reveal as="ol" group step={110} className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <div className="mb-5 flex h-[68px] w-[68px] items-center justify-center rounded-full border-[1.5px] border-ink font-display text-[22px]">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mb-2 text-h6">{step.title}</h3>
                  <p className="text-body text-ink-soft">{step.body}</p>
                </li>
              ))}
            </Reveal>
          </Container>
        </section>

        {/* ---------- Final CTA ---------- */}
        <section className="gutter pb-24 pt-5">
          <Container>
            <Reveal className="relative overflow-hidden rounded-3xl bg-ink px-8 py-14 text-center">
              <span className="eyebrow justify-center !text-sky before:!bg-sky">
                Ready when you are
              </span>
              <h2 className="mx-auto mb-4 mt-3 max-w-[16ch] text-h2 text-white">
                Ready to find your course?
              </h2>
              <p className="mx-auto mb-8 max-w-[42ch] text-lede text-paper/60">
                Book a free consultation. We&rsquo;ll help you shortlist the right
                programmes and guide you through every step, deadline to visa.
              </p>
              <div className="flex flex-wrap justify-center gap-3.5">
                <Cta
                  href="/contact"
                  variant="onDark"
                  className="hover:bg-sky-text hover:text-white"
                >
                  Book free consultation
                  <ArrowRight size={15} aria-hidden="true" />
                </Cta>
                <Cta
                  href="/tools/course-finder"
                  variant="outline"
                  className="border-white/35 text-white hover:bg-white/10 hover:text-white"
                >
                  Try course finder
                </Cta>
              </div>
            </Reveal>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
