import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getConsentHistory } from "@/lib/consent/record";

/**
 * The one place that knows a person is scattered across unlinked tables.
 *
 * `leads`, `newsletter_subscribers` and `applicants` each hold an email and
 * nothing joins them. Anything that has to act on "everything we hold about
 * this person" — the s.11 export and the s.12 erasure both do — has to fan
 * out across all three, and that fan-out is implemented here once rather
 * than re-derived (and quietly under-covered) at each call site.
 *
 * Adding a table that stores personal data means adding it here. That is the
 * maintenance cost of the email-as-join-key design, and it is cheaper than
 * the alternative of retrofitting a person table across live data.
 */

/**
 * Whether a counselor's internal notes go into the person's own export.
 *
 * Off. Internal notes are still the data principal's personal data and s.11
 * reaches them — this is not a refusal, it is a change of channel. A note may
 * carry a counselor's assessment or name a third party, and s.11(2) does not
 * compel disclosure that would reveal another data principal's data; deciding
 * which is which needs a human read, not a serialiser.
 *
 * So the export tells the person the notes exist and how to ask, and the ask
 * is handled as an admin-reviewed manual step. The route is published rather
 * than buried: silently omitting data from an access request, with no mention
 * that anything was withheld, is the failure this comment exists to prevent.
 */
const EXPORT_INCLUDES_INTERNAL_NOTES = false;

/**
 * Stable pseudonym for rows that survive an erasure.
 *
 * Salted so the mapping cannot be reversed by hashing a list of candidate
 * addresses — without a secret, an unsalted hash of an email address is
 * effectively still the email address. When the salt is unset the rows are
 * still unlinked from the person, but re-identification resistance is weaker,
 * so the deploy is warned rather than silently degraded.
 */
function pseudonymFor(email: string): string {
  const salt = process.env.DPDP_PSEUDONYM_SALT;
  if (!salt) {
    console.warn(
      "[erasure] DPDP_PSEUDONYM_SALT is not set — retained compliance rows are hashed without a secret salt.",
    );
  }
  const digest = createHash("sha256")
    .update(`${salt ?? "gradmire-unsalted"}:${email.toLowerCase()}`)
    .digest("hex")
    .slice(0, 32);
  return `erased:${digest}`;
}

/** Unique, obviously-not-real address for an anonymised applicant row. */
function tombstoneEmail(): string {
  return `erased+${randomUUID()}@gradmire.invalid`;
}

/* ------------------------------------------------------------------ */
/* Access — s.11                                                       */
/* ------------------------------------------------------------------ */

export type PersonalDataBundle = Awaited<ReturnType<typeof collectPersonalData>>;

/**
 * Everything held about one person, assembled for export.
 *
 * Shaped for a human reading the JSON, not for a machine re-importing it:
 * each section says what it is and where it came from, because an export
 * that a person cannot interpret does not really discharge s.11.
 */
export async function collectPersonalData(rawEmail: string) {
  const email = rawEmail.toLowerCase();

  const [applicant, leadRows, newsletterRows, consentHistory] = await Promise.all([
    db.query.applicants.findFirst({ where: eq(schema.applicants.email, email) }),
    db.query.leads.findMany({ where: eq(schema.leads.email, email) }),
    db.query.newsletterSubscribers.findMany({
      where: eq(schema.newsletterSubscribers.email, email),
    }),
    getConsentHistory(email),
  ]);

  const applications = applicant
    ? await db.query.applications.findMany({
        where: eq(schema.applications.applicantId, applicant.id),
        with: { events: true },
      })
    : [];

  const [parentalRows, exportRows, deletionRows, correctionRows, grievanceRows, nomination] =
    await Promise.all([
      db.query.parentalConsentRequests.findMany({
        where: eq(schema.parentalConsentRequests.subjectEmail, email),
      }),
      db.query.dataExportRequests.findMany({
        where: eq(schema.dataExportRequests.subjectEmail, email),
      }),
      db.query.deletionRequests.findMany({
        where: eq(schema.deletionRequests.subjectEmail, email),
      }),
      db.query.correctionRequests.findMany({
        where: eq(schema.correctionRequests.subjectEmail, email),
      }),
      db.query.grievances.findMany({ where: eq(schema.grievances.subjectEmail, email) }),
      db.query.nominations.findFirst({ where: eq(schema.nominations.subjectEmail, email) }),
    ]);

  return {
    export: {
      subject: email,
      generatedAt: new Date().toISOString(),
      producedBy: "Gradmire — Data Principal access request (DPDP Act, 2023, s.11)",
      note: "This is everything Gradmire holds about you in its own systems. Documents you sent a counselor by email or messaging app are handled separately — see the privacy policy, or ask the Grievance Officer for a copy.",
    },

    account: applicant
      ? {
          source: "applicants — your Gradmire account",
          fullName: applicant.fullName,
          email: applicant.email,
          phone: applicant.phone,
          dateOfBirth: applicant.dateOfBirth,
          createdAt: applicant.createdAt,
          updatedAt: applicant.updatedAt,
          linkedToSignIn: Boolean(applicant.authUserId),
        }
      : null,

    enquiries: leadRows.map((lead) => ({
      source: "leads — consultation requests you submitted",
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      dateOfBirth: lead.dateOfBirth,
      preferredIntake: lead.preferredIntake,
      message: lead.message,
      submittedFromPage: lead.sourcePath,
      status: lead.status,
      createdAt: lead.createdAt,
    })),

    newsletter: newsletterRows.map((row) => ({
      source: "newsletter_subscribers — deadline reminder emails",
      email: row.email,
      confirmed: row.confirmed,
      unsubscribedAt: row.unsubscribedAt,
      createdAt: row.createdAt,
    })),

    applications: applications.map((app) => ({
      source: "applications — university applications we are handling for you",
      reference: app.reference,
      universityName: app.universityName,
      programmeName: app.programmeName,
      intake: app.intake,
      stage: app.stage,
      noteToYou: app.applicantNote,
      counselorInternalNotes: EXPORT_INCLUDES_INTERNAL_NOTES
        ? app.internalNotes
        : app.internalNotes
          ? "[Withheld from automatic export. A counselor has written working notes on this application. They are your personal data and you can ask for them: email the Grievance Officer quoting this application reference. We review them by hand first, only to remove anything that would reveal someone else's personal data, and tell you if we do.]"
          : null,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      timeline: app.events.map((event) => ({
        stage: event.stage,
        note: event.note,
        at: event.createdAt,
      })),
    })),

    consentHistory: consentHistory.map((row) => ({
      source: "consent_records — what you agreed to, and when",
      purpose: row.purposeKey,
      granted: row.granted,
      noticeVersion: row.noticeVersion,
      capturedFrom: row.source,
      ipAddress: row.ipAddress,
      at: row.createdAt,
    })),

    parentalConsent: parentalRows.map((row) => ({
      source: "parental_consent_requests — guardian permission (under-18s)",
      parentEmail: row.parentEmail,
      parentName: row.parentName,
      relationship: row.relationship,
      status: row.status,
      requestedAt: row.createdAt,
      verifiedAt: row.verifiedAt,
    })),

    nomination: nomination
      ? {
          source: "nominations — who may act for you (s.14)",
          nomineeName: nomination.nomineeName,
          nomineeEmail: nomination.nomineeEmail,
          relationship: nomination.nomineeRelationship,
          updatedAt: nomination.updatedAt,
        }
      : null,

    rightsRequests: {
      source: "your previous requests to us",
      exports: exportRows.map((r) => ({ at: r.createdAt, status: r.status, format: r.format })),
      deletions: deletionRows.map((r) => ({ at: r.createdAt, status: r.status })),
      corrections: correctionRows.map((r) => ({
        at: r.createdAt,
        status: r.status,
        details: r.details,
        resolution: r.resolutionNote,
      })),
      grievances: grievanceRows.map((r) => ({
        reference: r.reference,
        at: r.createdAt,
        category: r.category,
        details: r.details,
        status: r.status,
        responseDueAt: r.responseDueAt,
        resolution: r.resolutionNote,
      })),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Erasure — s.12(3)                                                   */
/* ------------------------------------------------------------------ */

export type RetainedRecord = {
  table: string;
  rows: number;
  basis: string;
  until?: string;
};

export type ErasureResult = {
  erased: Record<string, number>;
  retained: RetainedRecord[];
  /** False when the Supabase auth record could not be removed — needs a human. */
  authDeleted: boolean;
  authReason?: string;
};

/**
 * Actually erases someone, rather than flagging them as deleted.
 *
 * Two things deliberately survive, and the caller is expected to show both to
 * the person rather than quietly keeping them:
 *
 *   1. An enrolled application, anonymised. Gradmire is paid by a university
 *      on enrolment, so the commission record has to stay for the statutory
 *      financial retention period. Name, contact details, date of birth and
 *      every free-text note are stripped; what remains is a reference, a
 *      university, a programme and a date.
 *   2. The compliance ledgers — consent records, rights requests, grievances
 *      — with the email replaced by a salted pseudonym. These are the proof
 *      that the Act was complied with, including the proof that this very
 *      erasure happened, and deleting them would destroy the defence.
 *
 * Everything else goes: leads, newsletter subscriptions, non-enrolled
 * applications and their timelines, nominations, and the account itself.
 */
export async function erasePersonalData(rawEmail: string): Promise<ErasureResult> {
  const email = rawEmail.toLowerCase();
  const pseudonym = pseudonymFor(email);
  const erased: Record<string, number> = {};
  const retained: RetainedRecord[] = [];

  await db.transaction(async (tx) => {
    const deletedLeads = await tx
      .delete(schema.leads)
      .where(eq(schema.leads.email, email))
      .returning({ id: schema.leads.id });
    erased.enquiries = deletedLeads.length;

    const deletedSubs = await tx
      .delete(schema.newsletterSubscribers)
      .where(eq(schema.newsletterSubscribers.email, email))
      .returning({ id: schema.newsletterSubscribers.id });
    erased.newsletterSubscriptions = deletedSubs.length;

    const deletedNominations = await tx
      .delete(schema.nominations)
      .where(eq(schema.nominations.subjectEmail, email))
      .returning({ id: schema.nominations.id });
    erased.nominations = deletedNominations.length;

    const applicant = await tx.query.applicants.findFirst({
      where: eq(schema.applicants.email, email),
    });

    if (applicant) {
      const applications = await tx.query.applications.findMany({
        where: eq(schema.applications.applicantId, applicant.id),
        columns: { id: true, stage: true },
      });

      const keepIds = applications.filter((a) => a.stage === "enrolled").map((a) => a.id);
      const dropIds = applications.filter((a) => a.stage !== "enrolled").map((a) => a.id);

      if (dropIds.length > 0) {
        // application_events cascade from applications.
        await tx.delete(schema.applications).where(inArray(schema.applications.id, dropIds));
      }
      erased.applications = dropIds.length;

      if (keepIds.length > 0) {
        // Strip every free-text field: a counselor note is where a name,
        // a phone number or a family detail actually ends up in practice.
        await tx
          .update(schema.applications)
          .set({ internalNotes: null, applicantNote: null, updatedAt: new Date() })
          .where(inArray(schema.applications.id, keepIds));

        await tx
          .update(schema.applicationEvents)
          .set({ note: null })
          .where(inArray(schema.applicationEvents.applicationId, keepIds));

        // The applicant row cannot be deleted without cascading the
        // applications above, so it is emptied and tombstoned instead.
        await tx
          .update(schema.applicants)
          .set({
            email: tombstoneEmail(),
            fullName: null,
            phone: null,
            dateOfBirth: null,
            authUserId: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.applicants.id, applicant.id));

        erased.account = 0;
        retained.push({
          table: "applications",
          rows: keepIds.length,
          basis:
            "Financial record of an enrolment Gradmire was paid a commission on. Anonymised: reference, university, programme and dates only.",
          until: "8 years from the end of the financial year of enrolment",
        });
      } else {
        await tx.delete(schema.applicants).where(eq(schema.applicants.id, applicant.id));
        erased.account = 1;
      }
    } else {
      erased.applications = 0;
      erased.account = 0;
    }

    // Compliance ledgers: pseudonymised, never deleted.
    const pseudonymised = await Promise.all([
      tx
        .update(schema.consentRecords)
        .set({ subjectEmail: pseudonym, ipAddress: null, userAgent: null })
        .where(eq(schema.consentRecords.subjectEmail, email))
        .returning({ id: schema.consentRecords.id }),
      tx
        .update(schema.parentalConsentRequests)
        .set({
          subjectEmail: pseudonym,
          subjectName: null,
          subjectDateOfBirth: null,
          parentEmail: pseudonym,
          parentName: null,
          ipAddress: null,
          userAgent: null,
        })
        .where(eq(schema.parentalConsentRequests.subjectEmail, email))
        .returning({ id: schema.parentalConsentRequests.id }),
      tx
        .update(schema.dataExportRequests)
        .set({ subjectEmail: pseudonym, authUserId: null, ipAddress: null })
        .where(eq(schema.dataExportRequests.subjectEmail, email))
        .returning({ id: schema.dataExportRequests.id }),
      tx
        .update(schema.correctionRequests)
        .set({ subjectEmail: pseudonym, authUserId: null })
        .where(eq(schema.correctionRequests.subjectEmail, email))
        .returning({ id: schema.correctionRequests.id }),
      tx
        .update(schema.grievances)
        .set({ subjectEmail: pseudonym, subjectName: null })
        .where(eq(schema.grievances.subjectEmail, email))
        .returning({ id: schema.grievances.id }),
    ]);

    const ledgerRows = pseudonymised.reduce((sum, rows) => sum + rows.length, 0);
    if (ledgerRows > 0) {
      retained.push({
        table: "consent and rights records",
        rows: ledgerRows,
        basis:
          "Proof that Gradmire had a lawful basis to process your data and that your requests — including this deletion — were carried out. Your email address is replaced with a one-way code, so these rows can no longer be traced back to you.",
        until: "5 years",
      });
    }
  });

  return { erased, retained, authDeleted: false };
}

export { pseudonymFor };
