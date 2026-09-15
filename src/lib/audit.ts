import "server-only";
import { db, schema } from "@/db";
import { requestMetadata } from "@/lib/consent/record";
import { checkMassRead } from "@/lib/breach";

/**
 * Writes the access trail (DPDP s.8(5)).
 *
 * Every function here is fire-and-forget and swallows its own errors. That is
 * a deliberate trade: a logging failure must never take down the page that
 * was serving a counselor their caseload, and a request that succeeds without
 * a log line is a smaller problem than an outage. The failure is written to
 * the console so it is still visible in Vercel's logs.
 *
 * The rule for what goes in: the shape of the access, never its content. A
 * subject email and a row count, never the rows themselves — an audit log
 * that copies the data it audits has doubled the exposure it exists to catch.
 */

export type AccessEntry = {
  actorType: "staff" | "data_principal" | "system";
  actorId?: string | null;
  actorEmail?: string | null;
  action: "list" | "view" | "export" | "erase" | "update" | "consent_read";
  resourceType: string;
  resourceId?: string | null;
  subjectEmail?: string | null;
  rowCount?: number | null;
};

export async function logAccess(entry: AccessEntry): Promise<void> {
  try {
    const { ipAddress } = await requestMetadata();
    await db.insert(schema.accessLogs).values({
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId ?? null,
      subjectEmail: entry.subjectEmail?.toLowerCase() ?? null,
      rowCount: entry.rowCount ?? null,
      ipAddress,
    });
  } catch (error) {
    console.error("[audit] failed to write access log", error);
  }
}

/**
 * Convenience for the admin surfaces, which all log the same actor shape.
 *
 * Also the detection point for an unusually large read. The audit log is the
 * only place that sees every access with its row count, so it is the natural
 * place to notice one that looks like extraction rather than work.
 */
export async function logStaffAccess(
  context: { staff: { id: string; email: string } },
  entry: Omit<AccessEntry, "actorType" | "actorId" | "actorEmail">,
): Promise<void> {
  await logAccess({
    ...entry,
    actorType: "staff",
    actorId: context.staff.id,
    actorEmail: context.staff.email,
  });

  if (entry.rowCount && entry.rowCount > 0) {
    await checkMassRead({
      actorEmail: context.staff.email,
      resourceType: entry.resourceType,
      rowCount: entry.rowCount,
    });
  }
}
