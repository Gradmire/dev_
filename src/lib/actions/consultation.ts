"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { consultationSchema, newsletterSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { FORM_PURPOSES } from "@/lib/consent/purposes";
import {
  decisionsFromFormData,
  missingRequiredPurposes,
  recordConsentDecisions,
} from "@/lib/consent/record";
import { isMinor } from "@/lib/consent/age";
import { generateToken } from "@/lib/tokens";

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Set when the failure was a storage error, so the UI can offer a direct mailto fallback. */
  code?: "server_error";
  /**
   * Set on success when the submission cannot proceed on its own. Today that
   * is only an under-18 applicant, whose enquiry is held until a guardian
   * confirms (DPDP s.9) — the form swaps to the parental consent step rather
   * than reporting a plain success it has not really earned.
   */
  next?: { step: "parental_consent"; subjectEmail: string; subjectName?: string };
};

async function clientKey(prefix: string) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "unknown";
  return `${prefix}:${ip}`;
}

/**
 * Records a consultation request. This is the site's only conversion point,
 * so it fails loudly rather than silently: the caller always learns whether
 * the enquiry was stored.
 */
export async function submitConsultation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = consultationSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    dateOfBirth: formData.get("dateOfBirth") ?? "",
    courseHubSlug: formData.get("courseHubSlug") ?? "",
    preferredIntake: formData.get("preferredIntake") ?? "",
    message: formData.get("message") ?? "",
    sourcePath: formData.get("sourcePath") ?? "",
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Honeypot: report success so a bot does not learn it was caught.
  if (parsed.data.website) return { ok: true, message: "Thanks — we'll be in touch." };

  const limit = rateLimit(await clientKey("consultation"), { limit: 3, windowMs: 60_000 });
  if (!limit.ok) {
    return {
      ok: false,
      message: `Too many requests. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  const { fullName, email, phone, dateOfBirth, courseHubSlug, preferredIntake, message, sourcePath } =
    parsed.data;

  // Consent is captured before anything is written, and the required
  // purposes are re-checked server-side: the checkboxes are `required` in the
  // markup, which stops an honest mistake and nothing else.
  const offered = FORM_PURPOSES.consultation;
  const decisions = decisionsFromFormData(formData, offered);
  const missing = missingRequiredPurposes(decisions, offered);
  if (missing.length > 0) {
    return {
      ok: false,
      message: "We need your permission on the essentials before we can take your enquiry.",
      fieldErrors: Object.fromEntries(
        missing.map((key) => [`consent.${key}`, ["Tick this to continue"]]),
      ),
    };
  }

  try {
    let courseHubId: string | null = null;
    if (courseHubSlug) {
      const hub = await db.query.courseHubs.findFirst({
        where: eq(schema.courseHubs.slug, courseHubSlug),
        columns: { id: true },
      });
      courseHubId = hub?.id ?? null;
    }

    // Atomic: an enquiry stored without its consent record is personal data
    // with no provable lawful basis, and a consent record without the enquiry
    // is a promise about data we do not hold. Neither half is worth keeping
    // on its own.
    await db.transaction(async (tx) => {
      await tx.insert(schema.leads).values({
        fullName,
        email,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
        courseHubId,
        preferredIntake: preferredIntake || null,
        message: message || null,
        sourcePath: sourcePath || null,
      });

      await recordConsentDecisions(
        {
          subjectEmail: email,
          source: sourcePath || "consultation-form",
          decisions,
        },
        tx,
      );
    });

    // Under 18: the enquiry is held and the form moves to the guardian step
    // rather than promising a counselor call we are not allowed to make yet.
    if (isMinor(dateOfBirth)) {
      return {
        ok: true,
        message:
          "Thanks — because you're under 18, we need a parent or guardian's permission before a counselor can help.",
        next: { step: "parental_consent", subjectEmail: email, subjectName: fullName },
      };
    }

    return {
      ok: true,
      message:
        "Booked. A counselor who specializes in your subject will email you within one working day.",
    };
  } catch (error) {
    console.error("[consultation] failed to store lead", error);
    return {
      ok: false,
      code: "server_error",
      message: "We couldn't save that just now. Email us and we'll pick it up directly:",
    };
  }
}

export async function subscribeToNewsletter(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"),
    courseHubSlug: formData.get("courseHubSlug") ?? "",
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Enter a valid email address.",
    };
  }
  if (parsed.data.website) return { ok: true, message: "You're on the list." };

  const limit = rateLimit(await clientKey("newsletter"), { limit: 5, windowMs: 60_000 });
  if (!limit.ok) {
    return { ok: false, message: `Too many requests. Try again in ${limit.retryAfterSeconds}s.` };
  }

  try {
    let courseHubId: string | null = null;
    if (parsed.data.courseHubSlug) {
      const hub = await db.query.courseHubs.findFirst({
        where: eq(schema.courseHubs.slug, parsed.data.courseHubSlug),
        columns: { id: true },
      });
      courseHubId = hub?.id ?? null;
    }

    await db.transaction(async (tx) => {
      await tx
      .insert(schema.newsletterSubscribers)
      .values({
        email: parsed.data.email,
        courseHubId,
        // Ticking the box is the informed, itemised consent s.6 asks for, so
        // the row is confirmed on the strength of it. A double opt-in is the
        // better answer and is blocked on there being a mailer at all — see
        // docs/dpdp/ropa.md, "Newsletter".
        confirmed: true,
        unsubscribeToken: generateToken(),
      })
      // Re-subscribing after unsubscribing should work, not error.
      .onConflictDoUpdate({
        target: schema.newsletterSubscribers.email,
        set: { unsubscribedAt: null, courseHubId, confirmed: true },
      });

      await recordConsentDecisions(
        {
          subjectEmail: parsed.data.email,
          source: "newsletter-form",
          decisions: { marketing_email: true },
        },
        tx,
      );
    });

    return { ok: true, message: "You're on the list. We'll send deadline reminders for your subject." };
  } catch (error) {
    console.error("[newsletter] failed to subscribe", error);
    return { ok: false, message: "We couldn't sign you up just now. Try again shortly." };
  }
}
