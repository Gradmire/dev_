import Link from "next/link";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CONTACT_EMAIL,
  GRIEVANCE_OFFICER,
  RIGHTS_SLA,
  DATA_LOCATIONS,
  RETENTION,
} from "@/config/site";
import { CONSENT_PURPOSES, PURPOSE_ORDER } from "@/lib/consent/purposes";
import { MINOR_AGE_THRESHOLD } from "@/lib/consent/age";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Gradmire collects, uses, shares and protects your personal data, your rights under India's Digital Personal Data Protection Act, 2023, and how to contact our Grievance Officer.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "15 September 2026";

/**
 * The privacy policy.
 *
 * The purpose, data-category and retention tables are rendered from
 * `CONSENT_PURPOSES` rather than retyped, and the locations, SLAs and
 * retention periods come from config. That is the point: a policy that
 * restates the code in prose drifts from it within a release, and a published
 * retention period that no longer matches what the purge actually does is a
 * misrepresentation rather than a stale document.
 */

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      <div className="space-y-3 text-body text-muted-foreground">{children}</div>
    </section>
  );
}

const CONTENTS = [
  ["who-we-are", "Who we are"],
  ["what-we-collect", "What we collect, and why"],
  ["consent", "Consent, and taking it back"],
  ["children", "If you are under 18"],
  ["sharing", "Who we share it with"],
  ["transfers", "Where your data is processed"],
  ["retention", "How long we keep it"],
  ["rights", "Your rights"],
  ["grievance", "Complaints and the Grievance Officer"],
  ["security", "How we protect it"],
  ["cookies", "Cookies"],
  ["documents", "Documents you send your counselor"],
  ["changes", "Changes to this policy"],
] as const;

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <div className="mx-auto max-w-3xl gutter py-16">
          <div className="mb-10 text-center">
            <Badge variant="outline" className="mb-4">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Privacy Policy
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-meta text-muted-foreground">
              Last updated {LAST_UPDATED}
            </p>
          </div>

          <div className="mb-10 rounded-2xl border border-line bg-paper-dim p-5 text-meta text-ink-soft">
            Written to meet India&rsquo;s Digital Personal Data Protection Act,
            2023, which applies to us because we offer services to people in
            India. It has not yet been reviewed by a lawyer — treat it as a
            good-faith account of what we actually do, and have it checked
            before relying on it for compliance purposes.
          </div>

          <nav
            aria-label="Contents"
            className="mb-12 rounded-2xl border border-line bg-white p-5"
          >
            <h2 className="mb-3 font-mono text-mini uppercase tracking-[0.1em] text-ink-soft">
              On this page
            </h2>
            <ol className="grid gap-x-6 gap-y-1.5 text-body sm:grid-cols-2">
              {CONTENTS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-ink-soft hover:text-ink hover:underline">
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-10">
            <Section id="who-we-are" title="Who we are">
              <p>
                Gradmire (&quot;we&quot;, &quot;us&quot;) helps students find and
                apply to UK university courses. When you use gradmire.com, our
                tools, or the applicant portal, we decide what happens to the
                information you give us — which makes us a{" "}
                <strong className="text-ink">Data Fiduciary</strong> under the
                Digital Personal Data Protection Act, 2023, and you a{" "}
                <strong className="text-ink">Data Principal</strong>.
              </p>
              <p>
                Questions about anything here go to{" "}
                <a href={`mailto:${GRIEVANCE_OFFICER.email}`} className="underline">
                  {GRIEVANCE_OFFICER.email}
                </a>
                .
              </p>
            </Section>

            <Section id="what-we-collect" title="What we collect, and why">
              <p>
                We ask for your permission separately for each of the purposes
                below, and each one is optional unless it is marked essential.
                The exact wording you agreed to, and when, is recorded — you can
                see your own history in your{" "}
                <Link href="/account/consent" className="underline">
                  consent settings
                </Link>
                .
              </p>

              <div className="scroll-x-hint mt-5 overflow-x-auto rounded-2xl border border-line">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-paper-dim">
                      {["Purpose", "What we collect", "How long we keep it"].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="px-4 py-3 font-mono text-micro uppercase tracking-[0.1em] text-ink-soft"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PURPOSE_ORDER.map((key) => {
                      const purpose = CONSENT_PURPOSES[key];
                      return (
                        <tr key={key} className="border-b border-line align-top last:border-0">
                          <td className="px-4 py-3.5">
                            <span className="block font-medium text-ink">
                              {purpose.label}
                            </span>
                            <span className="mt-1 block text-meta">
                              {purpose.description}
                            </span>
                            {purpose.required && (
                              <span className="mt-1.5 inline-block rounded-pill bg-paper-dim px-2 py-0.5 font-mono text-micro uppercase tracking-wider text-ink-soft">
                                Essential
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-meta">
                            {purpose.dataCategories.join(", ")}
                          </td>
                          <td className="px-4 py-3.5 text-meta">{purpose.retention}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="mt-5">
                We also record limited technical information automatically: your
                IP address and browser user agent when you give or withdraw
                consent (as proof of what was agreed), and your IP address
                briefly in memory to rate-limit our forms against spam. We do not
                build a profile of you, and we do not track you across other
                websites.
              </p>
              <p>
                <strong className="text-ink">We do not sell your personal data</strong>{" "}
                to anyone, for any purpose.
              </p>
            </Section>

            <Section id="consent" title="Consent, and taking it back">
              <p>
                Everything above rests on your consent. Nothing is pre-ticked,
                and we ask for each purpose separately rather than bundling them
                — agreeing to let a counselor call you is not agreeing to
                marketing email.
              </p>
              <p>
                <strong className="text-ink">
                  Withdrawing is as easy as agreeing was.
                </strong>{" "}
                Turn any optional purpose off in your{" "}
                <Link href="/account/consent" className="underline">
                  consent settings
                </Link>
                , or use the unsubscribe link in any email — one click, no
                account needed, no reason required. Withdrawing one purpose never
                affects the others.
              </p>
              <p>
                Withdrawing the essential purposes means we can no longer handle
                your application at all, so that is done by deleting your account
                — see <a href="#rights" className="underline">your rights</a>{" "}
                below.
              </p>
            </Section>

            <Section id="children" title={`If you are under ${MINOR_AGE_THRESHOLD}`}>
              <p>
                We ask for your date of birth because the law gives under-
                {MINOR_AGE_THRESHOLD}s extra protection. If you are under{" "}
                {MINOR_AGE_THRESHOLD}, we hold your enquiry but do nothing else
                with it until a parent or guardian confirms — we email them a
                link, they confirm they are your guardian, and only then can a
                counselor start work.
              </p>
              <p>
                We ask them to declare that they are your parent or guardian. We
                do not ask anyone to upload an identity document for this.
              </p>
              <p>
                <strong className="text-ink">
                  We never advertise to children, and we never track anyone for
                  advertising
                </strong>{" "}
                — we run no advertising or analytics of any kind.
              </p>
              <p>
                A parent or guardian can withdraw permission at any time by
                emailing{" "}
                <a href={`mailto:${GRIEVANCE_OFFICER.email}`} className="underline">
                  {GRIEVANCE_OFFICER.email}
                </a>
                , and we will delete everything we hold.
              </p>
            </Section>

            <Section id="sharing" title="Who we share it with">
              <p>We share your data with three kinds of recipient, and no others:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-ink">Universities you shortlist</strong> —
                  only where you have given us that specific permission, and only
                  the universities on your own shortlist.
                </li>
                <li>
                  <strong className="text-ink">Our service providers</strong>, who
                  process data on our instructions and nobody else&rsquo;s:
                  Supabase (database, sign-in and email delivery) and Vercel
                  (hosting). They are contractually limited to what we ask them
                  to do.
                </li>
                <li>
                  <strong className="text-ink">Our own counselors and admins</strong>,
                  and only as far as their role requires — a counselor sees their
                  own caseload, not everyone&rsquo;s.
                </li>
              </ul>
              <p>
                We do not share your data with advertisers, data brokers, or
                anyone for marketing purposes.
              </p>
            </Section>

            <Section id="transfers" title="Where your data is processed">
              <p>
                Your data is stored and processed{" "}
                <strong className="text-ink">outside India</strong>. We tell you
                this because the Act requires it:
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                {DATA_LOCATIONS.map((location) => (
                  <li key={location.name}>
                    {location.name} — <strong className="text-ink">{location.region}</strong>
                  </li>
                ))}
              </ul>
              <p>
                Transfers outside India are permitted under the Act except to
                countries the Central Government has restricted. None of the
                above is restricted. If that changes, we will move the data and
                update this page.
              </p>
            </Section>

            <Section id="retention" title="How long we keep it">
              <p>
                We delete data automatically once its purpose is served — it is
                not kept indefinitely and it is not kept &ldquo;just in
                case&rdquo;. The periods in the table above are enforced by a job
                that runs every night.
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  Enquiries: {RETENTION.leadMonths} months from our last contact
                  with you.
                </li>
                <li>
                  Unsubscribed email addresses: {RETENTION.unsubscribedMonths}{" "}
                  months, kept only so we can honour your opt-out.
                </li>
                <li>
                  Records of who accessed personal data:{" "}
                  {RETENTION.accessLogMonths} months.
                </li>
                <li>
                  Unused parental permission requests:{" "}
                  {RETENTION.staleParentalRequestDays} days.
                </li>
                <li>
                  If you enrol at a university through us, an anonymised record
                  of the enrolment is kept for 8 years as a financial record. It
                  carries no name or contact details.
                </li>
              </ul>
            </Section>

            <Section id="rights" title="Your rights">
              <p>
                All of these are self-service in your{" "}
                <Link href="/account/data" className="underline">
                  data settings
                </Link>{" "}
                — no request to approve, no waiting on us.
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-ink">Access.</strong> Download
                  everything we hold about you, as JSON or CSV, immediately. If a
                  counselor has written working notes on your application, the
                  download tells you so and how to ask for them; we review those
                  by hand first, only to remove anything that would reveal
                  someone else&rsquo;s personal data, and we tell you if we do.
                </li>
                <li>
                  <strong className="text-ink">Correction and completion.</strong>{" "}
                  Edit your own details directly. For anything else, send a
                  correction request — we action it within{" "}
                  {RIGHTS_SLA.correctionDays} days.
                </li>
                <li>
                  <strong className="text-ink">Erasure.</strong> Delete your
                  account. This is a real deletion, not a deactivation flag: your
                  account, enquiries, newsletter subscription, unenrolled
                  applications and sign-in are all removed. We show you exactly
                  what has to be retained, and why, before you confirm.
                </li>
                <li>
                  <strong className="text-ink">Nomination.</strong> Name someone
                  who may exercise these rights for you if you die or become
                  unable to act for yourself.
                </li>
                <li>
                  <strong className="text-ink">Grievance redressal.</strong> See
                  below.
                </li>
              </ul>
            </Section>

            <Section id="grievance" title="Complaints and the Grievance Officer">
              <p>
                If we have handled your data badly, tell our Grievance Officer.
                This is the formal channel under the Act:
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong className="text-ink">{GRIEVANCE_OFFICER.name}</strong> —{" "}
                  <a href={`mailto:${GRIEVANCE_OFFICER.email}`} className="underline">
                    {GRIEVANCE_OFFICER.email}
                  </a>
                </li>
                <li>
                  Or use the{" "}
                  <Link href="/grievance" className="underline">
                    grievance form
                  </Link>
                  , which gives you a reference number.
                </li>
                <li>
                  We respond within{" "}
                  <strong className="text-ink">{RIGHTS_SLA.grievanceDays} days</strong>.
                </li>
              </ul>
              <p>
                If you are not satisfied with our answer, you can escalate to the{" "}
                <strong className="text-ink">Data Protection Board of India</strong>.
                You do not need our permission, and you do not have to wait for us
                to finish.
              </p>
            </Section>

            <Section id="security" title="How we protect it">
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  Everything is encrypted in transit — between you and us, and
                  between us and our database, where we verify the server&rsquo;s
                  certificate rather than merely encrypting.
                </li>
                <li>Data is encrypted at rest by our database provider.</li>
                <li>
                  Staff see only what their role requires. A counselor sees their
                  own caseload; only an admin can see across counselors or read
                  the consent records.
                </li>
                <li>
                  Every access to personal data is logged — who, what, when, and
                  how much — and unusually large reads raise an alert.
                </li>
                <li>
                  We have a breach procedure that reports to the Data Protection
                  Board and to you within 72 hours of becoming aware.
                </li>
              </ul>
              <p>
                If you believe you have found a security problem, email{" "}
                <a href={`mailto:${GRIEVANCE_OFFICER.email}`} className="underline">
                  {GRIEVANCE_OFFICER.email}
                </a>{" "}
                and we will get back to you.
              </p>
            </Section>

            <Section id="cookies" title="Cookies">
              <p>
                We use <strong className="text-ink">one kind of cookie</strong>:
                the session cookie that keeps you signed in to the portal and
                account pages. It is set only on those pages.
              </p>
              <p>
                We use no analytics, no advertising pixels, and no third-party
                tracking cookies of any kind. That is why you have never seen a
                cookie banner here — we do not have anything to ask you about.
              </p>
              <p>
                The Deadline Tracker saves the courses you are following in your
                own browser. That never reaches us.
              </p>
            </Section>

            <Section id="documents" title="Documents you send your counselor">
              <p>
                Applying to a UK university means sending documents — transcripts,
                passport pages, financial statements. At the moment these are
                handled over email with your counselor rather than through this
                website, which means they are not covered by the automatic
                download and deletion tools above.
              </p>
              <p>
                We are telling you this rather than leaving it unsaid. Those
                documents are deleted 12 months after your application closes,
                and if you ask us to delete your data, your counselor removes
                them by hand and confirms it. To get a copy, or to have them
                deleted sooner, email{" "}
                <a href={`mailto:${GRIEVANCE_OFFICER.email}`} className="underline">
                  {GRIEVANCE_OFFICER.email}
                </a>
                .
              </p>
            </Section>

            <Section id="changes" title="Changes to this policy">
              <p>
                We update the date at the top whenever this changes. Where a
                change affects something you consented to, we record the new
                version against your consent — an old agreement never silently
                inherits new terms, and your consent settings will tell you if
                the wording has moved on since you agreed.
              </p>
            </Section>
          </div>

          <Separator className="my-10" />
          <p className="text-center text-micro text-muted-foreground">
            See also our{" "}
            <Link href="/terms" className="underline">
              Terms of Service
            </Link>
            . General enquiries:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
