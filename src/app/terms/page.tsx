import Link from "next/link";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CONTACT_EMAIL } from "@/config/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that apply when you use Gradmire's website, tools, and applicant portal.",
};

const LAST_UPDATED = "11 September 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="space-y-3 text-body text-muted-foreground">{children}</div>
    </section>
  );
}

function TermsPageContent() {
  return (
    <div className="mx-auto max-w-3xl gutter py-16">
      <div className="text-center mb-10">
        <Badge variant="outline" className="mb-4">
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          Terms of Service
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-meta text-muted-foreground">
          Last updated {LAST_UPDATED}
        </p>
      </div>

      <div className="mb-10 rounded-2xl border border-line bg-paper-dim p-5 text-meta text-ink-soft">
        This is a good-faith draft written to match how Gradmire actually
        operates today. It has not yet been reviewed by a lawyer — treat it
        as a starting point, not finished legal advice, and have it checked
        before relying on it for compliance purposes.
      </div>

      <div className="space-y-10">
        <Section title="Acceptance of terms">
          <p>
            By using gradmire.com, our tools, or the applicant portal, you
            agree to these terms. If you don&apos;t agree, please don&apos;t
            use the site.
          </p>
        </Section>

        <Section title="What Gradmire is">
          <p>
            Gradmire is a study-abroad information and application-support
            service. We help you compare courses and universities, and we
            offer consultation, application, and visa guidance support. We
            are an advisory service — we don&apos;t control university
            admissions decisions, visa authority decisions, or the accuracy
            of every third party we reference.
          </p>
        </Section>

        <Section title="No guarantee of admission or outcome">
          <p>
            Course details, fees, rankings, and graduate salary figures
            shown on the site are informational and sourced from public data
            or university publications; they can change without notice and
            we don&apos;t guarantee their accuracy at any given moment.
            Using Gradmire does not guarantee admission to any course,
            university, or visa approval — those decisions are made solely
            by the relevant institution or authority.
          </p>
        </Section>

        <Section title="Your account">
          <p>
            If you create an applicant portal account, you&apos;re
            responsible for keeping your login secure and for the accuracy
            of the information you submit through it. Let us know at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
              {CONTACT_EMAIL}
            </a>{" "}
            if you believe your account has been accessed without your
            permission.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Submit false information through our forms or portal.</li>
            <li>
              Attempt to abuse, scrape, or overload our tools, forms, or
              infrastructure.
            </li>
            <li>
              Use the site for any purpose that&apos;s unlawful or infringes
              someone else&apos;s rights.
            </li>
          </ul>
        </Section>

        <Section title="Intellectual property">
          <p>
            The Gradmire name, logo, and site content are our property or
            used under license. You may use the site for your own personal,
            non-commercial study-planning purposes; you may not copy or
            republish our course data or tools for a competing service.
          </p>
        </Section>

        <Section title="Third-party links">
          <p>
            The site links to universities, visa authorities, and other
            third-party resources. We aren&apos;t responsible for the
            content or availability of those external sites.
          </p>
        </Section>

        <Section title="Disclaimer and limitation of liability">
          <p>
            The site and its tools are provided &quot;as is&quot;, without
            warranties of any kind. To the extent permitted by law, Gradmire
            is not liable for indirect or consequential losses arising from
            your use of the site, including decisions made based on course,
            fee, or salary data shown here.
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We&apos;ll update the date at the top of this page whenever
            these terms change, and post the new version here.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about these terms? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>

      <Separator className="my-10" />
      <p className="text-center text-micro text-muted-foreground">
        See also our{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <TermsPageContent />
      </main>
      <SiteFooter />
    </>
  );
}
