import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import {
  Heart,
  Globe,
  Users,
  Target,
  Award,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Metadata } from "next";
import { routeMetadata } from "@/lib/metadata";

export const metadata: Metadata = routeMetadata({
  path: "/about",
  title: "About",
  description:
    "We built Gradmire because country-first advice wasn't working. Learn about our course-first approach to study abroad.",
});

function AboutPageContent() {
  return (
    <div className="mx-auto max-w-4xl gutter py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <Badge variant="outline" className="mb-4">
          <Heart className="mr-1.5 h-3.5 w-3.5" />
          About Gradmire
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          We built this because country-first advice wasn&apos;t working.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Every study abroad platform we used started with the same question:
          &ldquo;What country do you want to study in?&rdquo; But that&apos;s
          the wrong question. Your course shapes your career, your network, and
          your earning potential far more than which city you happen to study in.
          We built Gradmire to flip that model — start with the subject, then
          find the best university and destination around it.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Right now, Gradmire has live course guides for 3 of the 8 UK
          subjects we&apos;re building — <strong>Business &amp; Management</strong>,{" "}
          <strong>Computer Science, AI &amp; Data Science</strong>, and{" "}
          <strong>Engineering &amp; Technology</strong> — each with fees, entry
          requirements, deadlines, and graduate salary data. The rest of the UK
          subject list, plus the US, Canada, and Australia, are actively in
          progress; you can join the waitlist for any destination to be
          notified when it launches.
        </p>
      </div>

      <Separator className="mb-16" />

      {/* Values */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-10">What we stand for</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              icon: Target,
              title: "Course-First",
              desc: "We believe the right programme matters more than the right postcode. Everything we build starts from the subject.",
            },
            {
              icon: Globe,
              title: "Destination-Agnostic",
              desc: "We're building for every major study-abroad destination, not just one. Our data model is multi-country from day one.",
            },
            {
              icon: Award,
              title: "Transparent",
              desc: "We flag draft copy, placeholder data, and coming-soon states clearly. We'd rather be honest than polished.",
            },
          ].map((val, i) => (
            <Card key={i}>
              <CardContent className="p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <val.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{val.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {val.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="mb-16" />

      {/* Who's behind this */}
      <section id="team" className="mb-16">
        <h2 className="text-2xl font-bold text-center mb-10">Who&apos;s behind Gradmire</h2>
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Users className="h-8 w-8 text-primary/50" />
            </div>
            {/*
             * TODO(founder bio): Gradmire is a solo-founder project right
             * now — this needs a first-person bio for the one named person
             * behind it, not an institutional "we" or a team grid. At
             * minimum, supply:
             *   - Name and (optional) photo
             *   - Relevant background — why you're the person building this
             *   - A plain, first-person statement that Gradmire is new and
             *     hasn't placed any students yet. That's a stronger claim
             *     than a vague "our team" line, and matches the "we'd
             *     rather be honest than polished" value above — don't
             *     soften it into institutional voice.
             * Leaving the name/copy below as placeholders on purpose:
             * fill in the real ones rather than generating plausible text.
             */}
            <h3 className="mt-4 font-semibold">[Founder name — TODO]</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              TODO: first-person founder bio. See the comment in this file
              (src/app/about/page.tsx) for what it needs to cover.
            </p>
          </CardContent>
        </Card>
      </section>

      {/*
       * Trust markers, removed rather than shown with placeholder values.
       * Three of the four numbers had nothing real behind them ("—" for
       * students helped, university partners, success rate) — an empty
       * stat grid reads worse than no stat grid at all. Restore this once
       * there are real figures for at least most of these, with a
       * `SourcedStat` (see Phase 4) for each rather than a bare number.
       *
       * <Separator className="mb-16" />
       * <section>
       *   <h2 className="text-2xl font-bold text-center mb-10">
       *     Trust markers
       *   </h2>
       *   <div className="grid gap-6 sm:grid-cols-4">
       *     {[
       *       { label: "Students Helped", value: "—" },
       *       { label: "University Partners", value: "—" },
       *       { label: "Countries Covered", value: "1 (UK)" },
       *       { label: "Success Rate", value: "—" },
       *     ].map((marker, i) => (
       *       <Card key={i}>
       *         <CardContent className="p-5 text-center">
       *           <div className="text-2xl font-bold text-primary">
       *             {marker.value}
       *           </div>
       *           <div className="mt-1 text-sm text-muted-foreground">
       *             {marker.label}
       *           </div>
       *         </CardContent>
       *       </Card>
       *     ))}
       *   </div>
       * </section>
       */}
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <AboutPageContent />
      </main>
      <SiteFooter />
    </>
  );
}
