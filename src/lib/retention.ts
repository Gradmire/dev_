import "server-only";
import { and, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { logAccess } from "@/lib/audit";
import { RETENTION } from "@/config/site";

/**
 * Storage limitation (DPDP s.8(7)) — the job that actually deletes things.
 *
 * Nothing was ever deleted before this. `leads` and `newsletter_subscribers`
 * grew without bound, which is both a standing obligation breach and a plain
 * amplifier of any future breach: the oldest enquiry in the table is the one
 * with the least justification for still being there, and it is just as
 * exposed as the newest.
 *
 * The periods come from `RETENTION` in config/site.ts, which is also what the
 * privacy policy renders. They must not drift apart — the retention a person
 * was told about is the retention that applies, and this file is what makes
 * that promise true rather than aspirational.
 */

function monthsAgo(months: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() - months);
  return d;
}

function daysAgo(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - days * 24 * 60 * 60 * 1000);
}

export type PurgeReport = {
  ranAt: string;
  deleted: Record<string, number>;
  anonymised: Record<string, number>;
  dryRun: boolean;
};

/**
 * Applies every retention period. Idempotent, so it is safe to run on a
 * schedule, by hand, or twice by accident.
 *
 * `dryRun` counts what would go without touching anything, because the first
 * run of a delete job against live personal data should be a report, not an
 * act of faith.
 */
export async function purgeExpiredData({
  dryRun = false,
  now = new Date(),
}: { dryRun?: boolean; now?: Date } = {}): Promise<PurgeReport> {
  const deleted: Record<string, number> = {};
  const anonymised: Record<string, number> = {};

  /* ---- Enquiries past their retention period ---------------------- */
  // Measured from `updatedAt`, which a counselor touches on every status
  // change — so "last contact", not "first contact". A lead that converted
  // into an application is kept with the application instead.
  const leadCutoff = monthsAgo(RETENTION.leadMonths, now);
  const staleLeads = await db
    .select({ id: schema.leads.id })
    .from(schema.leads)
    .where(
      and(
        lt(schema.leads.updatedAt, leadCutoff),
        or(eq(schema.leads.status, "closed"), eq(schema.leads.status, "new")),
      ),
    );
  deleted.leads = staleLeads.length;
  if (!dryRun && staleLeads.length > 0) {
    await db.delete(schema.leads).where(
      inArray(
        schema.leads.id,
        staleLeads.map((l) => l.id),
      ),
    );
  }

  /* ---- Unsubscribed addresses ------------------------------------- */
  // Held past the unsubscribe only long enough to honour it, then removed.
  const unsubCutoff = monthsAgo(RETENTION.unsubscribedMonths, now);
  const staleSubs = await db
    .select({ id: schema.newsletterSubscribers.id })
    .from(schema.newsletterSubscribers)
    .where(
      and(
        isNotNull(schema.newsletterSubscribers.unsubscribedAt),
        lt(schema.newsletterSubscribers.unsubscribedAt, unsubCutoff),
      ),
    );
  deleted.newsletterSubscribers = staleSubs.length;
  if (!dryRun && staleSubs.length > 0) {
    await db.delete(schema.newsletterSubscribers).where(
      inArray(
        schema.newsletterSubscribers.id,
        staleSubs.map((row) => row.id),
      ),
    );
  }

  /* ---- Abandoned parental consent requests ------------------------ */
  // These hold a parent's email address for a decision that never came.
  const parentalCutoff = daysAgo(RETENTION.staleParentalRequestDays, now);
  const staleParental = await db
    .select({ id: schema.parentalConsentRequests.id })
    .from(schema.parentalConsentRequests)
    .where(
      and(
        lt(schema.parentalConsentRequests.createdAt, parentalCutoff),
        or(
          eq(schema.parentalConsentRequests.status, "pending"),
          eq(schema.parentalConsentRequests.status, "expired"),
        ),
        isNull(schema.parentalConsentRequests.verifiedAt),
      ),
    );
  deleted.parentalConsentRequests = staleParental.length;
  if (!dryRun && staleParental.length > 0) {
    await db.delete(schema.parentalConsentRequests).where(
      inArray(
        schema.parentalConsentRequests.id,
        staleParental.map((r) => r.id),
      ),
    );
  }

  /* ---- Audit trail ------------------------------------------------ */
  const logCutoff = monthsAgo(RETENTION.accessLogMonths, now);
  const staleLogs = await db
    .select({ id: schema.accessLogs.id })
    .from(schema.accessLogs)
    .where(lt(schema.accessLogs.createdAt, logCutoff));
  deleted.accessLogs = staleLogs.length;
  if (!dryRun && staleLogs.length > 0) {
    await db.delete(schema.accessLogs).where(lt(schema.accessLogs.createdAt, logCutoff));
  }

  /* ---- Withdrawn applications ------------------------------------- */
  // Anonymised rather than deleted: the counselor notes are the personal
  // data, and stripping them leaves a shape that is still useful for
  // reporting without being about anybody. Enrolled applications are
  // deliberately untouched — those carry the 8-year financial obligation.
  const appCutoff = monthsAgo(RETENTION.closedApplicationMonths, now);
  const staleApps = await db
    .select({ id: schema.applications.id })
    .from(schema.applications)
    .where(
      and(
        eq(schema.applications.stage, "withdrawn"),
        lt(schema.applications.updatedAt, appCutoff),
        isNotNull(schema.applications.internalNotes),
      ),
    );
  anonymised.applications = staleApps.length;
  if (!dryRun && staleApps.length > 0) {
    await db
      .update(schema.applications)
      .set({ internalNotes: null, applicantNote: null })
      .where(
        inArray(
          schema.applications.id,
          staleApps.map((a) => a.id),
        ),
      );
  }

  const report: PurgeReport = {
    ranAt: now.toISOString(),
    deleted,
    anonymised,
    dryRun,
  };

  if (!dryRun) {
    const total =
      Object.values(deleted).reduce((a, b) => a + b, 0) +
      Object.values(anonymised).reduce((a, b) => a + b, 0);
    if (total > 0) {
      await logAccess({
        actorType: "system",
        action: "erase",
        resourceType: "retention_purge",
        rowCount: total,
      });
    }
  }

  return report;
}

export { RETENTION };
