import type { Metadata } from "next";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAccount } from "@/lib/auth";
import { RIGHTS_SLA, GRIEVANCE_OFFICER } from "@/config/site";
import {
  ExportPanel,
  ProfileForm,
  CorrectionRequestForm,
  NominationForm,
  DeleteAccountForm,
} from "@/components/rights/data-tools";

export const metadata: Metadata = {
  title: "My data",
  robots: { index: false, follow: false },
};

/** Reflects live records, including requests raised seconds ago. */
export const dynamic = "force-dynamic";

function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-9">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="mb-2 mt-3 text-[22px] font-semibold text-ink">{title}</h2>
      <p className="mb-6 max-w-[62ch] text-ui text-ink-soft">{lede}</p>
      {children}
    </section>
  );
}

export default async function MyDataPage() {
  const { email, applicant } = await requireAccount();

  const [nomination, corrections] = await Promise.all([
    db.query.nominations.findFirst({ where: eq(schema.nominations.subjectEmail, email) }),
    db.query.correctionRequests.findMany({
      where: eq(schema.correctionRequests.subjectEmail, email),
      orderBy: [desc(schema.correctionRequests.createdAt)],
      limit: 10,
    }),
  ]);

  return (
    <>
      <span className="eyebrow">Your rights</span>
      <h1 className="mb-2 mt-3 text-[clamp(26px,3.4vw,38px)] font-semibold">My data</h1>
      <p className="mb-11 max-w-[62ch] text-lede text-ink-soft">
        Signed in as {email}. Everything on this page you can do yourself, right
        now — no request to approve, no waiting on us.
      </p>

      <div className="space-y-11">
        <Section
          eyebrow="Access"
          title="Download everything we hold about you"
          lede="A complete copy of your record — your account, your enquiries, your applications and their timelines, and every consent decision you've made. JSON keeps the structure; CSV opens in a spreadsheet."
        >
          <ExportPanel />
        </Section>

        <Section
          eyebrow="Correction"
          title="Fix what's wrong"
          lede="Your own details you can edit directly, and the change flows through to any open enquiry. For anything else — a wrong university on an application, a note that isn't right — send us a correction request."
        >
          <div className="space-y-9">
            <ProfileForm
              fullName={applicant?.fullName ?? ""}
              phone={applicant?.phone ?? ""}
              dateOfBirth={applicant?.dateOfBirth ?? ""}
            />

            <div className="border-t border-dashed border-line pt-8">
              <h3 className="mb-4 text-[17px] font-semibold text-ink">
                Something else needs correcting
              </h3>
              <CorrectionRequestForm />

              {corrections.length > 0 && (
                <div className="mt-6">
                  <h4 className="mb-2.5 font-mono text-mini uppercase tracking-[0.1em] text-ink-soft">
                    Your correction requests
                  </h4>
                  <ul className="space-y-2.5">
                    {corrections.map((req) => (
                      <li
                        key={req.id}
                        className="rounded-lg border border-line bg-white px-4 py-3"
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <time
                            dateTime={req.createdAt.toISOString()}
                            className="font-mono text-micro uppercase tracking-[0.1em] text-ink-soft"
                          >
                            {req.createdAt.toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </time>
                          <span className="rounded-pill bg-paper-dim px-2.5 py-0.5 font-mono text-micro uppercase tracking-wider text-ink-soft">
                            {req.status.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-meta text-ink-soft">{req.details}</p>
                        {req.resolutionNote && (
                          <p className="mt-1.5 border-l-[3px] border-sky pl-3 text-meta text-ink">
                            {req.resolutionNote}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Nomination"
          title="Name someone to act for you"
          lede="If you die or become unable to act for yourself, the person you name here can exercise these rights on your behalf — access your record, correct it, or have it deleted. You can change or remove them whenever you like."
        >
          <NominationForm
            hasNomination={Boolean(nomination)}
            nomineeName={nomination?.nomineeName ?? ""}
            nomineeEmail={nomination?.nomineeEmail ?? ""}
            nomineeRelationship={nomination?.nomineeRelationship ?? ""}
          />
        </Section>

        <Section
          id="delete"
          eyebrow="Erasure"
          title="Delete my account"
          lede="This erases your data for real — it isn't a deactivation flag or a hidden account we could switch back on. Read what we're required to keep before you go ahead."
        >
          <DeleteAccountForm />
        </Section>

        <Section
          eyebrow="Grievance"
          title="If we get something wrong"
          lede={`Our Grievance Officer answers complaints about how we handle your data within ${RIGHTS_SLA.grievanceDays} days. If you're not satisfied with the answer, you can escalate to the Data Protection Board of India.`}
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/grievance"
              className="inline-flex items-center rounded-pill bg-ink px-5 py-2.5 text-ui font-semibold text-paper transition-colors hover:bg-navy"
            >
              Raise a grievance
            </Link>
            <a
              href={`mailto:${GRIEVANCE_OFFICER.email}`}
              className="text-ui text-ink-soft underline hover:text-ink"
            >
              {GRIEVANCE_OFFICER.email}
            </a>
          </div>
        </Section>
      </div>
    </>
  );
}
