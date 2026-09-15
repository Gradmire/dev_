import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ShieldCheck, Clock, XCircle } from "lucide-react";
import { db, schema } from "@/db";
import { hashToken } from "@/lib/tokens";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { Container } from "@/components/ui/container";
import { ParentalDecisionForm } from "@/components/consent/parental-decision-form";
import { CONSENT_PURPOSES } from "@/lib/consent/purposes";
import { GRIEVANCE_OFFICER, CONTACT_EMAIL } from "@/config/site";

export const metadata: Metadata = {
  title: "Permission for a child's enquiry",
  // A link in an email, addressed to one person. It has no business in an index.
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="gutter py-16">
        <Container className="max-w-[62ch]">{children}</Container>
      </main>
      <SiteFooter />
    </>
  );
}

function Dead({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Shell>
      <div className="rounded-2xl border border-line bg-paper-dim p-10 text-center">
        <div className="mx-auto mb-4 w-fit text-ink-soft">{icon}</div>
        <h1 className="mb-3 text-[24px] font-semibold text-ink">{title}</h1>
        <div className="mx-auto max-w-[46ch] text-ui text-ink-soft">{children}</div>
      </div>
    </Shell>
  );
}

/**
 * Where a guardian's emailed link lands (DPDP s.9, Rule 10).
 *
 * The reader has, in all likelihood, never heard of Gradmire — so the page
 * leads with who is asking and what for, and only then with the decision. A
 * page that opened with two buttons and no context would read like phishing,
 * and a parent who bins it as phishing is a child whose enquiry never moves.
 */
export default async function ParentalConsentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const request = await db.query.parentalConsentRequests.findFirst({
    where: eq(schema.parentalConsentRequests.tokenHash, hashToken(token)),
  });

  if (!request) {
    return (
      <Dead icon={<XCircle size={34} aria-hidden="true" />} title="This link isn't valid">
        <p>
          Check you copied the whole link from the email. If it still doesn&rsquo;t
          work, write to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
            {CONTACT_EMAIL}
          </a>{" "}
          and we&rsquo;ll sort it out.
        </p>
      </Dead>
    );
  }

  if (request.status !== "pending") {
    return (
      <Dead
        icon={<ShieldCheck size={34} aria-hidden="true" />}
        title="This link has already been used"
      >
        <p>
          A decision was recorded on{" "}
          {(request.verifiedAt ?? request.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . To change it, ask them to send a new request from their account, or
          contact{" "}
          <a href={`mailto:${GRIEVANCE_OFFICER.email}`} className="underline">
            {GRIEVANCE_OFFICER.email}
          </a>
          .
        </p>
      </Dead>
    );
  }

  if (request.expiresAt <= new Date()) {
    return (
      <Dead icon={<Clock size={34} aria-hidden="true" />} title="This link has expired">
        <p>
          Permission links are valid for 72 hours. Ask them to send a new one from
          their Gradmire account and it&rsquo;ll arrive at this address.
        </p>
      </Dead>
    );
  }

  const childName = request.subjectName ?? "your child";
  // What they are actually being asked to permit — the same registry the child
  // saw, so the two can never drift apart.
  const purposes = [
    CONSENT_PURPOSES.core_service,
    CONSENT_PURPOSES.counselling_contact,
  ];

  return (
    <Shell>
      <span className="eyebrow">Permission needed</span>
      <h1 className="mb-4 mt-3 text-[clamp(26px,3.4vw,36px)] font-semibold">
        Can we help {childName} apply to university?
      </h1>

      <p className="mb-4 text-lede text-ink-soft">
        Gradmire helps students find and apply to UK master&rsquo;s and
        undergraduate courses. {childName} ({request.subjectEmail}) asked us for
        help and gave your address as their {request.relationship ?? "parent or guardian"}.
      </p>
      <p className="mb-9 text-ui text-ink-soft">
        Because they&rsquo;re under 18, India&rsquo;s Digital Personal Data
        Protection Act means we need your permission before we do anything with
        their information beyond holding the enquiry itself. Until you decide,
        their enquiry sits untouched.
      </p>

      <div className="mb-9 rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-[18px] font-semibold text-ink">
          What you&rsquo;re agreeing to
        </h2>
        <ul className="space-y-5">
          {purposes.map((purpose) => (
            <li key={purpose.key}>
              <h3 className="text-body font-semibold text-ink">{purpose.label}</h3>
              <p className="mt-1 text-meta text-ink-soft">{purpose.description}</p>
              <dl className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-micro uppercase tracking-[0.1em] text-ink-soft">
                    What we hold
                  </dt>
                  <dd className="mt-1 text-meta text-ink-soft">
                    {purpose.dataCategories.join(" · ")}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-micro uppercase tracking-[0.1em] text-ink-soft">
                    How long
                  </dt>
                  <dd className="mt-1 text-meta text-ink-soft">{purpose.retention}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>

        <div className="mt-6 border-t border-line pt-5 text-meta text-ink-soft">
          <p className="mb-1.5">
            <strong className="font-semibold text-ink">We never</strong> advertise to
            children, track them for advertising, or sell anyone&rsquo;s details.
          </p>
          <p>
            You can withdraw this permission at any time by writing to{" "}
            <a href={`mailto:${GRIEVANCE_OFFICER.email}`} className="underline">
              {GRIEVANCE_OFFICER.email}
            </a>
            , and we&rsquo;ll delete everything we hold about them. Full detail is in
            our{" "}
            <Link href="/privacy" className="underline hover:text-ink">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>

      <ParentalDecisionForm token={token} childName={childName} />
    </Shell>
  );
}
