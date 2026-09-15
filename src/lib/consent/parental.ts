import "server-only";
import { and, desc, eq, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { ageBand } from "./age";

/**
 * The parental consent gate (DPDP s.9, Rule 10).
 *
 * The rule this encodes: an applicant who is under 18 may make an enquiry,
 * and nothing more, until a parent or guardian confirms. Holding the enquiry
 * itself is what lets us contact the parent at all, so blocking that too
 * would make the flow impossible rather than safe.
 */

export type ParentalGate =
  | { state: "not_required"; reason: "adult" }
  /** No date of birth on file. Not proof of adulthood — see age.ts. */
  | { state: "unknown_age" }
  | { state: "required" }
  | { state: "pending"; parentEmail: string; requestedAt: Date; expiresAt: Date }
  | { state: "verified"; parentEmail: string; verifiedAt: Date }
  | { state: "declined"; declinedAt: Date }
  | { state: "expired"; parentEmail: string };

/**
 * Newest request wins: a declined or expired request can be superseded by a
 * fresh one, and the gate should reflect where things actually stand rather
 * than the first attempt ever made.
 */
export async function latestParentalRequest(subjectEmail: string) {
  return db.query.parentalConsentRequests.findFirst({
    where: eq(schema.parentalConsentRequests.subjectEmail, subjectEmail.toLowerCase()),
    orderBy: [desc(schema.parentalConsentRequests.createdAt)],
  });
}

export async function parentalGate(
  subjectEmail: string,
  dateOfBirth: string | Date | null | undefined,
  now: Date = new Date(),
): Promise<ParentalGate> {
  const band = ageBand(dateOfBirth, now);
  if (band === "adult") return { state: "not_required", reason: "adult" };

  const request = await latestParentalRequest(subjectEmail);

  // No date of birth and no request on file: nothing says this is a child,
  // but nothing says otherwise either. Surfaced rather than assumed away.
  if (band === "unknown" && !request) return { state: "unknown_age" };
  if (!request) return { state: "required" };

  switch (request.status) {
    case "verified":
      return {
        state: "verified",
        parentEmail: request.parentEmail,
        verifiedAt: request.verifiedAt ?? request.createdAt,
      };
    case "declined":
      return { state: "declined", declinedAt: request.verifiedAt ?? request.createdAt };
    case "expired":
      return { state: "expired", parentEmail: request.parentEmail };
    case "pending":
      // Expiry is enforced on read as well as on use, so a stale row does not
      // present as a live request just because nothing has swept it yet.
      if (request.expiresAt <= now) {
        return { state: "expired", parentEmail: request.parentEmail };
      }
      return {
        state: "pending",
        parentEmail: request.parentEmail,
        requestedAt: request.createdAt,
        expiresAt: request.expiresAt,
      };
  }
}

/**
 * Whether an application may move beyond the enquiry stage.
 *
 * `unknown_age` is allowed through: every applicant predating the date of
 * birth field would otherwise be frozen, which would break the live caseload
 * on deploy. The admin UI flags those rows instead so a counselor can ask.
 */
export async function mayProgressBeyondEnquiry(
  subjectEmail: string,
  dateOfBirth: string | Date | null | undefined,
): Promise<{ allowed: boolean; gate: ParentalGate }> {
  const gate = await parentalGate(subjectEmail, dateOfBirth);
  const allowed =
    gate.state === "not_required" || gate.state === "verified" || gate.state === "unknown_age";
  return { allowed, gate };
}

/**
 * Marks overdue pending requests as expired. Called before issuing a new one.
 *
 * One statement. This read every pending row, filtered them in JavaScript,
 * then issued an UPDATE per stale row — a select plus N writes to do what the
 * predicate expresses directly. The comparison belongs in SQL, where the
 * index on `subject_email` can serve it and the row count stops mattering.
 */
export async function expireStaleRequests(subjectEmail: string, now: Date = new Date()) {
  await db
    .update(schema.parentalConsentRequests)
    .set({ status: "expired" })
    .where(
      and(
        eq(schema.parentalConsentRequests.subjectEmail, subjectEmail.toLowerCase()),
        eq(schema.parentalConsentRequests.status, "pending"),
        lte(schema.parentalConsentRequests.expiresAt, now),
      ),
    );
}
