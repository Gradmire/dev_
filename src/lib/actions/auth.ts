"use server";

import { headers } from "next/headers";
import { db, schema } from "@/db";
import { createClient } from "@/lib/supabase/server";
import { signupSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { FORM_PURPOSES } from "@/lib/consent/purposes";
import {
  decisionsFromFormData,
  missingRequiredPurposes,
  recordConsentDecisions,
} from "@/lib/consent/record";
import { isMinor } from "@/lib/consent/age";
import { SITE_URL } from "@/config/site";
import type { FormState } from "@/lib/actions/consultation";

async function clientKey(prefix: string) {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    "unknown";
  return `${prefix}:${ip}`;
}

/**
 * Self-service signup. Creates the applicant row up front — the same row a
 * counselor would otherwise create by hand — so /auth/callback's existing
 * "link by email" step has something to attach the auth user to the moment
 * the visitor clicks their magic link.
 */
export async function signUp(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    dateOfBirth: formData.get("dateOfBirth") ?? "",
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
  if (parsed.data.website) {
    return { ok: true, message: "Check your inbox for a sign-in link." };
  }

  const limit = rateLimit(await clientKey("signup"), { limit: 5, windowMs: 60_000 });
  if (!limit.ok) {
    return {
      ok: false,
      message: `Too many requests. Try again in ${limit.retryAfterSeconds} seconds.`,
    };
  }

  const { fullName, email, dateOfBirth } = parsed.data;

  const offered = FORM_PURPOSES.signup;
  const decisions = decisionsFromFormData(formData, offered);
  const missing = missingRequiredPurposes(decisions, offered);
  if (missing.length > 0) {
    return {
      ok: false,
      message: "We need your permission on the essentials before we can create your account.",
      fieldErrors: Object.fromEntries(
        missing.map((key) => [`consent.${key}`, ["Tick this to continue"]]),
      ),
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, message: "Sign-up is temporarily unavailable. Please try again later." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
      .insert(schema.applicants)
      .values({ email, fullName, dateOfBirth: dateOfBirth || null })
      // A counselor may already have created this applicant by email — in
      // which case signing up just fills in their name, not a duplicate.
      .onConflictDoUpdate({
        target: schema.applicants.email,
        set: {
          fullName,
          // Only ever fills a gap: a counselor's hand-entered record has no
          // date of birth, but an existing one must not be overwritten by a
          // signup for an address someone else already holds.
          ...(dateOfBirth ? { dateOfBirth } : {}),
          updatedAt: new Date(),
        },
      });

      await recordConsentDecisions(
        { subjectEmail: email, source: "signup-form", decisions },
        tx,
      );
    });
  } catch (error) {
    console.error("[signup] failed to create applicant", error);
    return { ok: false, message: "We couldn't create your account just now. Try again shortly." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${SITE_URL}/auth/callback?next=/portal`,
      data: { full_name: fullName },
    },
  });

  if (error) {
    console.error("[signup] signInWithOtp failed", error);
    return { ok: false, message: "We couldn't send the link just now. Try again in a moment." };
  }

  if (isMinor(dateOfBirth)) {
    return {
      ok: true,
      message:
        "We sent a sign-in link. Because you're under 18, we also need a parent or guardian's permission before a counselor can help.",
      next: { step: "parental_consent", subjectEmail: email, subjectName: fullName },
    };
  }

  return {
    ok: true,
    message: "We sent a sign-in link to finish setting up your account.",
  };
}
