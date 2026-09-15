import "server-only";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  CONSENT_PURPOSES,
  PURPOSE_ORDER,
  isPurposeKey,
  noticeVersionFor,
  type PurposeKey,
} from "./purposes";

/**
 * Reading and writing the consent ledger.
 *
 * Every write here is an INSERT. Nothing in this module updates or deletes a
 * `consent_records` row, and nothing should: the ledger is the evidence that
 * consent was given, and an UPDATE would destroy the very thing it exists to
 * prove. Withdrawal is a new row with `granted = false`.
 */

export type ConsentDecision = {
  granted: boolean;
  at: Date;
  noticeVersion: string;
  /** True when the wording changed since this decision was captured. */
  stale: boolean;
};

export type ConsentState = Partial<Record<PurposeKey, ConsentDecision>>;

/**
 * IP and user agent, recorded alongside a consent decision as proof of the
 * circumstances it was given in.
 *
 * Kept to these two fields only. It is tempting to capture more of the
 * request for a richer audit trail, but this metadata is itself personal
 * data collected for one narrow purpose, and s.8(4) minimisation applies to
 * the compliance machinery exactly as it does to everything else.
 */
export async function requestMetadata(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? null;
  return { ipAddress, userAgent: h.get("user-agent") };
}

/**
 * Writes one row per decision.
 *
 * `decisions` is an explicit map rather than "the list of things they
 * ticked", so a declined purpose is recorded as a decline instead of as an
 * absence. Being able to show that someone was asked and said no is worth as
 * much as being able to show they said yes.
 */
export async function recordConsentDecisions(
  params: {
    subjectEmail: string;
    authUserId?: string | null;
    source: string;
    decisions: Partial<Record<PurposeKey, boolean>>;
  },
  /**
   * Transaction to write inside. Pass one whenever the consent is being
   * captured alongside the data it authorises: storing an enquiry without its
   * consent record leaves personal data with no provable lawful basis, which
   * is a worse state than having stored neither. Defaults to a plain write
   * for the cases with nothing to be atomic with.
   */
  executor: Pick<typeof db, "insert"> = db,
): Promise<void> {
  const entries = Object.entries(params.decisions).filter(
    (entry): entry is [PurposeKey, boolean] =>
      isPurposeKey(entry[0]) && typeof entry[1] === "boolean",
  );
  if (entries.length === 0) return;

  const { ipAddress, userAgent } = await requestMetadata();

  await executor.insert(schema.consentRecords).values(
    entries.map(([purposeKey, granted]) => ({
      subjectEmail: params.subjectEmail.toLowerCase(),
      authUserId: params.authUserId ?? null,
      purposeKey,
      granted,
      noticeVersion: noticeVersionFor(purposeKey),
      source: params.source,
      ipAddress,
      userAgent,
    })),
  );
}

/**
 * Current consent per purpose: the newest row wins.
 *
 * Read in full and reduced in memory rather than with a DISTINCT ON — a
 * person accumulates a handful of rows across a handful of purposes, and the
 * simpler query is easier to be sure is correct than a window function whose
 * ordering has to be exactly right.
 */
export async function getConsentState(subjectEmail: string): Promise<ConsentState> {
  const rows = await db.query.consentRecords.findMany({
    where: eq(schema.consentRecords.subjectEmail, subjectEmail.toLowerCase()),
    orderBy: [desc(schema.consentRecords.createdAt)],
    limit: 500,
  });

  const state: ConsentState = {};
  for (const row of rows) {
    if (!isPurposeKey(row.purposeKey)) continue; // A purpose we have since retired.
    if (state[row.purposeKey]) continue; // Newer row already seen.
    state[row.purposeKey] = {
      granted: row.granted,
      at: row.createdAt,
      noticeVersion: row.noticeVersion,
      stale: row.noticeVersion !== CONSENT_PURPOSES[row.purposeKey].version,
    };
  }
  return state;
}

/** Whether a specific purpose is currently consented to. Absence is not consent. */
export async function hasConsent(
  subjectEmail: string,
  purpose: PurposeKey,
): Promise<boolean> {
  const state = await getConsentState(subjectEmail);
  return state[purpose]?.granted === true;
}

/** The full ledger for one person, newest first — for the consent centre and export. */
export async function getConsentHistory(subjectEmail: string) {
  return db.query.consentRecords.findMany({
    where: eq(schema.consentRecords.subjectEmail, subjectEmail.toLowerCase()),
    orderBy: [desc(schema.consentRecords.createdAt)],
    limit: 500,
  });
}

/**
 * Parses posted consent checkboxes into a decision map.
 *
 * Every purpose the form offered appears in the result, ticked or not, which
 * is what makes an untouched optional box a recorded "no" rather than a gap.
 * A checkbox HTML never renders when unticked, so the set of offered
 * purposes has to come from the caller, not from the form data.
 */
export function decisionsFromFormData(
  formData: FormData,
  offered: readonly PurposeKey[],
): Partial<Record<PurposeKey, boolean>> {
  const decisions: Partial<Record<PurposeKey, boolean>> = {};
  for (const key of offered) {
    decisions[key] = formData.get(`consent.${key}`) === "on";
  }
  return decisions;
}

/** The purposes a form must have ticked before it may be accepted. */
export function missingRequiredPurposes(
  decisions: Partial<Record<PurposeKey, boolean>>,
  offered: readonly PurposeKey[],
): PurposeKey[] {
  return offered.filter((key) => CONSENT_PURPOSES[key].required && !decisions[key]);
}

export { PURPOSE_ORDER };
