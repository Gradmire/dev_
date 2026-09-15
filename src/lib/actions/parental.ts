"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  parentalConsentRequestSchema,
  parentalDeclarationSchema,
} from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { requestMetadata } from "@/lib/consent/record";
import { expireStaleRequests } from "@/lib/consent/parental";
import { ageBand } from "@/lib/consent/age";
import {
  PARENTAL_CONSENT_TTL_HOURS,
  expiryFromNow,
  generateToken,
  hashToken,
} from "@/lib/tokens";
import { sendEmail } from "@/lib/email/send";
import {
  parentalConsentEmail,
  parentalConsentOutcomeEmail,
} from "@/lib/email/templates";
import type { FormState } from "@/lib/actions/consultation";

/**
 * Issues a parental consent request and emails the guardian a one-time link.
 *
 * The token is generated here, hashed before storage, and exists in plaintext
 * only inside the email body — so it can never be recovered from the database
 * and the link cannot be re-sent, only re-issued.
 */
export async function requestParentalConsent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parentalConsentRequestSchema.safeParse({
    subjectEmail: formData.get("subjectEmail"),
    parentEmail: formData.get("parentEmail"),
    parentName: formData.get("parentName"),
    relationship: formData.get("relationship"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { subjectEmail, parentEmail, parentName, relationship } = parsed.data;

  if (parentEmail === subjectEmail) {
    return {
      ok: false,
      message: "Your parent or guardian needs their own email address — it can't be yours.",
      fieldErrors: { parentEmail: ["Use a different address from your own"] },
    };
  }

  const { ipAddress, userAgent } = await requestMetadata();
  const limit = rateLimit(`parental:${ipAddress ?? "unknown"}`, {
    limit: 3,
    windowMs: 60 * 60_000,
  });
  if (!limit.ok) {
    return {
      ok: false,
      message: `Too many requests. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
    };
  }

  // The child's name and date of birth are copied onto the request so a later
  // edit to their record cannot rewrite what the parent was told.
  const [applicant, lead] = await Promise.all([
    db.query.applicants.findFirst({ where: eq(schema.applicants.email, subjectEmail) }),
    db.query.leads.findFirst({ where: eq(schema.leads.email, subjectEmail) }),
  ]);

  const subjectName = applicant?.fullName ?? lead?.fullName ?? null;
  const subjectDateOfBirth = applicant?.dateOfBirth ?? lead?.dateOfBirth ?? null;

  if (!applicant && !lead) {
    return { ok: false, message: "We don't have an enquiry under that email address." };
  }

  // Nothing to gate if they are not actually a minor. Issuing the request
  // anyway would email a third party for no lawful reason.
  if (ageBand(subjectDateOfBirth) === "adult") {
    return { ok: true, message: "No parental permission is needed — you're over 18." };
  }

  await expireStaleRequests(subjectEmail);

  const token = generateToken();
  const expiresAt = expiryFromNow(PARENTAL_CONSENT_TTL_HOURS);

  try {
    await db.insert(schema.parentalConsentRequests).values({
      subjectEmail,
      subjectName,
      subjectDateOfBirth,
      parentEmail,
      parentName,
      relationship,
      tokenHash: hashToken(token),
      expiresAt,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("[parental] failed to store request", error);
    return { ok: false, message: "We couldn't send that just now. Try again shortly." };
  }

  const result = await sendEmail(
    parentalConsentEmail({
      parentEmail,
      parentName,
      childName: subjectName ?? "Your child",
      childEmail: subjectEmail,
      token,
      expiresAt,
    }),
  );

  // Never claim an email was sent when it was not. A child waiting on a
  // message that does not exist is the worst outcome this flow can produce.
  if (!result.delivered) {
    return {
      ok: false,
      code: "server_error",
      message:
        "We saved your request but couldn't send the email. Please contact us and we'll sort it out directly:",
    };
  }

  return {
    ok: true,
    message: `We've emailed ${parentEmail}. The link is valid for ${PARENTAL_CONSENT_TTL_HOURS} hours. Your enquiry stays on hold until they confirm.`,
  };
}

/**
 * The guardian's decision. Single-use: the request leaves `pending` either
 * way, so a forwarded link cannot be replayed to flip the answer.
 */
export async function submitParentalDecision(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parentalDeclarationSchema.safeParse({
    token: formData.get("token"),
    decision: formData.get("decision"),
    declaration: formData.get("declaration") ?? undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the form and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { token, decision, declaration } = parsed.data;

  // The declaration is the "verifiable" half of verifiable parental consent.
  // Granting without it is not consent, so it is required only on grant.
  if (decision === "grant" && declaration !== "on") {
    return {
      ok: false,
      message: "Tick the declaration to confirm you're their parent or guardian.",
      fieldErrors: { declaration: ["Tick the declaration to continue"] },
    };
  }

  const request = await db.query.parentalConsentRequests.findFirst({
    where: eq(schema.parentalConsentRequests.tokenHash, hashToken(token)),
  });

  if (!request) return { ok: false, message: "That link isn't valid." };
  if (request.status !== "pending") {
    return { ok: false, message: "That link has already been used." };
  }
  if (request.expiresAt <= new Date()) {
    await db
      .update(schema.parentalConsentRequests)
      .set({ status: "expired" })
      .where(eq(schema.parentalConsentRequests.id, request.id));
    return {
      ok: false,
      message: "That link has expired. Ask them to request a new one from their account.",
    };
  }

  const { ipAddress, userAgent } = await requestMetadata();
  const now = new Date();

  try {
    await db
      .update(schema.parentalConsentRequests)
      .set({
        status: decision === "grant" ? "verified" : "declined",
        declarationAcceptedAt: decision === "grant" ? now : null,
        verifiedAt: now,
        ipAddress,
        userAgent,
      })
      .where(eq(schema.parentalConsentRequests.id, request.id));
  } catch (error) {
    console.error("[parental] failed to record decision", error);
    return { ok: false, message: "We couldn't record that just now. Try again shortly." };
  }

  // Best effort: the decision is recorded either way, and a bounced
  // notification must not present as a failed decision.
  await sendEmail(
    parentalConsentOutcomeEmail({
      childEmail: request.subjectEmail,
      childName: request.subjectName ?? "there",
      granted: decision === "grant",
    }),
  );

  return {
    ok: true,
    message:
      decision === "grant"
        ? "Thank you — permission recorded. A counselor can now help them."
        : "Recorded. We've stopped processing their enquiry and let them know.",
  };
}
