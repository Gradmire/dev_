import "server-only";
import { GRIEVANCE_OFFICER, RIGHTS_SLA, SITE_URL } from "@/config/site";
import { sendEmail } from "@/lib/email/send";

/**
 * Breach detection hooks (DPDP s.8(6)).
 *
 * Not an incident-management system — the runbook in docs/dpdp/breach-runbook.md
 * is what a human follows. This is the part that has to be in code: the
 * moment something happens that *might* be a breach, the 72-hour clock has
 * already started, and nobody can start it if nobody is told.
 *
 * Every signal here is deliberately cheap and deliberately noisy. A false
 * positive costs someone five minutes; a missed one costs the reporting
 * window. Tune the thresholds down, never the alerting off.
 */

export type BreachSignal =
  | "bulk_export"
  | "auth_deletion_failed"
  | "erasure_incomplete"
  | "unauthorized_access_attempt"
  | "mass_read";

export type BreachAlert = {
  signal: BreachSignal;
  /** What happened, in a sentence someone woken at 3am can act on. */
  summary: string;
  /** Anything that helps scope it. Never the personal data itself. */
  context?: Record<string, string | number | null>;
};

/**
 * Above this many personal-data rows in one read, the access stops looking
 * like work and starts looking like extraction. Set against the real shape of
 * the admin lists, which page at 100.
 */
export const MASS_READ_THRESHOLD = 250;

/**
 * Raises an alert. Never throws: a failure to alert must not also take down
 * the request that noticed the problem, or the one visible symptom is lost
 * along with the alert.
 *
 * Email because it is the one channel already wired. A real deployment should
 * add a pager — the 72-hour clock does not pause overnight or at a weekend,
 * and an unread inbox is how a Friday incident becomes a Monday disclosure.
 */
export async function raiseBreachAlert(alert: BreachAlert): Promise<void> {
  const line = `[BREACH SIGNAL] ${alert.signal}: ${alert.summary}`;

  // Always to the log, regardless of whether email is configured — this is
  // the record that the signal fired, and it must survive a mail outage.
  console.error(line, alert.context ?? {});

  try {
    await sendEmail({
      to: GRIEVANCE_OFFICER.email,
      subject: `[Gradmire] Possible personal data breach — ${alert.signal}`,
      text: `${alert.summary}

Signal:     ${alert.signal}
Detected:   ${new Date().toISOString()}
Context:    ${JSON.stringify(alert.context ?? {}, null, 2)}

WHAT TO DO NOW
--------------
The ${RIGHTS_SLA.breachNotificationHours}-hour clock to notify the Data
Protection Board and affected users started when this was detected, not when
it is read. Do not wait for certainty about severity before starting.

Follow docs/dpdp/breach-runbook.md. Step 1 is to confirm or dismiss this
signal in writing — a dismissed signal still needs a record of who dismissed
it and why.

Audit trail for the window around this event:
${SITE_URL}/admin/privacy
`,
    });
  } catch (error) {
    console.error("[breach] failed to send alert", error);
  }
}

/** Flags a read large enough to look like extraction rather than work. */
export async function checkMassRead(params: {
  actorEmail: string;
  resourceType: string;
  rowCount: number;
}): Promise<void> {
  if (params.rowCount < MASS_READ_THRESHOLD) return;

  await raiseBreachAlert({
    signal: "mass_read",
    summary: `${params.actorEmail} read ${params.rowCount} rows from ${params.resourceType} in a single request.`,
    context: {
      actor: params.actorEmail,
      resource: params.resourceType,
      rows: params.rowCount,
      threshold: MASS_READ_THRESHOLD,
    },
  });
}

/**
 * An erasure that did not fully complete.
 *
 * Reported as a breach signal rather than just an error, because the failure
 * mode is that someone has been told their data is gone when some of it is
 * not — which is a compliance failure whether or not anything leaked.
 */
export async function reportIncompleteErasure(params: {
  subjectEmail: string;
  stage: string;
  detail: string;
}): Promise<void> {
  await raiseBreachAlert({
    signal: "erasure_incomplete",
    summary: `Erasure for a data principal did not complete at stage "${params.stage}". They may have been told their data was deleted. ${params.detail}`,
    context: { stage: params.stage, detail: params.detail },
  });
}
