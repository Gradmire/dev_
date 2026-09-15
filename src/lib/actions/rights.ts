"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteAuthUserByEmail } from "@/lib/supabase/admin";
import { erasePersonalData } from "@/lib/rights/collect";
import { requestMetadata } from "@/lib/consent/record";
import { logAccess } from "@/lib/audit";
import { reportIncompleteErasure } from "@/lib/breach";
import { rateLimit } from "@/lib/rate-limit";
import { RIGHTS_SLA } from "@/config/site";
import {
  correctionRequestSchema,
  deletionRequestSchema,
  grievanceSchema,
  nominationSchema,
  profileUpdateSchema,
} from "@/lib/validation";
import type { FormState } from "@/lib/actions/consultation";

/* ------------------------------------------------------------------ */
/* s.12(1) — correction, done directly                                 */
/* ------------------------------------------------------------------ */

/**
 * Self-service correction of the fields a person owns outright.
 *
 * The right to correct inaccurate data is not well served by a queue when the
 * field in question is the person's own phone number, so these three are
 * written straight through and the queue is kept for everything else.
 */
export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { email, applicant } = await requireAccount();

  const parsed = profileUpdateSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
    dateOfBirth: formData.get("dateOfBirth") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { fullName, phone, dateOfBirth } = parsed.data;

  try {
    if (applicant) {
      await db
        .update(schema.applicants)
        .set({
          fullName,
          phone: phone || null,
          dateOfBirth: dateOfBirth || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.applicants.id, applicant.id));
    } else {
      await db.insert(schema.applicants).values({
        email,
        fullName,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
      });
    }

    // The same person's open enquiries carry their own copy of these fields.
    // Correcting the account and leaving the lead stale would mean the
    // counselor still works from the wrong number.
    await db
      .update(schema.leads)
      .set({ fullName, phone: phone || null, dateOfBirth: dateOfBirth || null, updatedAt: new Date() })
      .where(eq(schema.leads.email, email));
  } catch (error) {
    console.error("[rights] profile update failed", error);
    return { ok: false, message: "We couldn't save that just now. Try again shortly." };
  }

  revalidatePath("/account/data");
  return { ok: true, message: "Saved." };
}

/** Everything a person cannot edit themselves goes through a tracked queue. */
export async function submitCorrectionRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { email, user } = await requireAccount();

  const parsed = correctionRequestSchema.safeParse({ details: formData.get("details") });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Tell us what needs correcting.",
    };
  }

  try {
    await db.insert(schema.correctionRequests).values({
      subjectEmail: email,
      authUserId: user.id,
      details: parsed.data.details,
    });
  } catch (error) {
    console.error("[rights] correction request failed", error);
    return { ok: false, message: "We couldn't log that just now. Try again shortly." };
  }

  revalidatePath("/account/data");
  return {
    ok: true,
    message: `Logged. We'll action it within ${RIGHTS_SLA.correctionDays} days and email you when it's done.`,
  };
}

/* ------------------------------------------------------------------ */
/* s.14 — nomination                                                   */
/* ------------------------------------------------------------------ */

export async function saveNomination(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { email, user } = await requireAccount();

  const parsed = nominationSchema.safeParse({
    nomineeName: formData.get("nomineeName"),
    nomineeEmail: formData.get("nomineeEmail"),
    nomineeRelationship: formData.get("nomineeRelationship") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Check the highlighted fields and try again.",
    };
  }

  const { nomineeName, nomineeEmail, nomineeRelationship } = parsed.data;

  if (nomineeEmail === email) {
    return {
      ok: false,
      message: "Nominate someone else — the point is that they can act if you can't.",
      fieldErrors: { nomineeEmail: ["Use someone else's address"] },
    };
  }

  try {
    await db
      .insert(schema.nominations)
      .values({
        subjectEmail: email,
        authUserId: user.id,
        nomineeName,
        nomineeEmail,
        nomineeRelationship: nomineeRelationship || null,
      })
      // One live nomination per person; naming a new one replaces the old.
      .onConflictDoUpdate({
        target: schema.nominations.subjectEmail,
        set: {
          nomineeName,
          nomineeEmail,
          nomineeRelationship: nomineeRelationship || null,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("[rights] nomination failed", error);
    return { ok: false, message: "We couldn't save that just now. Try again shortly." };
  }

  revalidatePath("/account/data");
  return { ok: true, message: `${nomineeName} can now act on your behalf if you can't.` };
}

export async function removeNomination(): Promise<void> {
  const { email } = await requireAccount();
  await db.delete(schema.nominations).where(eq(schema.nominations.subjectEmail, email));
  revalidatePath("/account/data");
}

/* ------------------------------------------------------------------ */
/* s.12(3) — erasure                                                   */
/* ------------------------------------------------------------------ */

/**
 * Deletes the account for real.
 *
 * The request row is written before the erasure and survives it — it is the
 * only proof the obligation was discharged, and it is written first so that a
 * crash midway leaves evidence that something was attempted rather than
 * silence. What survives the erasure and why is recorded on that row and
 * shown to the person on the way out; see lib/rights/collect.ts.
 */
export async function deleteMyAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { email, user } = await requireAccount();

  const parsed = deletionRequestSchema.safeParse({
    reason: formData.get("reason") ?? "",
    confirmation: formData.get("confirmation") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Type DELETE to confirm.",
    };
  }

  const { ipAddress } = await requestMetadata();

  let requestId: string | undefined;
  try {
    const [row] = await db
      .insert(schema.deletionRequests)
      .values({
        subjectEmail: email,
        authUserId: user.id,
        reason: parsed.data.reason || null,
        status: "in_progress",
        ipAddress,
      })
      .returning({ id: schema.deletionRequests.id });
    requestId = row.id;
  } catch (error) {
    console.error("[rights] could not open deletion request", error);
    return { ok: false, message: "We couldn't start that just now. Try again shortly." };
  }

  try {
    const result = await erasePersonalData(email);

    // The processor's copy. Reported rather than thrown on: the database
    // erasure has already happened, and rolling it back to match a failed
    // auth deletion would leave more data behind, not less.
    const auth = await deleteAuthUserByEmail(email);
    if (!auth.deleted && auth.reason !== "not_found") {
      // The database rows are gone but the auth record is not, so this person
      // could still sign in to an account we have told them is deleted.
      // That needs a human today, not at the next log review.
      await reportIncompleteErasure({
        subjectEmail: email,
        stage: "supabase_auth_user",
        detail: `deleteAuthUserByEmail returned "${auth.reason}". The auth record must be removed by hand in the Supabase dashboard. Deletion request ${requestId}.`,
      });
    }

    await db
      .update(schema.deletionRequests)
      .set({
        status: "completed",
        erasedSummary: result.erased,
        retainedSummary: result.retained,
        completedAt: new Date(),
      })
      .where(eq(schema.deletionRequests.id, requestId));

    await logAccess({
      actorType: "data_principal",
      actorId: user.id,
      actorEmail: email,
      action: "erase",
      resourceType: "personal_data_bundle",
      subjectEmail: email,
      rowCount: Object.values(result.erased).reduce((a, b) => a + b, 0),
    });
  } catch (error) {
    console.error("[rights] erasure failed", error);
    await db
      .update(schema.deletionRequests)
      .set({ status: "in_progress" })
      .where(eq(schema.deletionRequests.id, requestId));
    await reportIncompleteErasure({
      subjectEmail: email,
      stage: "database_erasure",
      detail: `The erasure threw part-way through and has been left as in_progress. Deletion request ${requestId} must be completed by hand.`,
    });
    return {
      ok: false,
      code: "server_error",
      message:
        "Something went wrong part-way through deleting your data. We've logged it and will finish it by hand — contact us if you'd like confirmation:",
    };
  }

  // Sign out last: the session is the only thing still tying this request to
  // a person, and dropping it earlier would lose the audit metadata above.
  const supabase = await createClient();
  await supabase?.auth.signOut();

  // Deliberately outside /account, which middleware gates — the person no
  // longer has a session by this point, and bouncing them to a login screen
  // is a poor way to confirm their account is gone.
  redirect("/account-deleted");
}

/* ------------------------------------------------------------------ */
/* s.13 — grievance redressal                                          */
/* ------------------------------------------------------------------ */

function makeGrievanceReference() {
  return `GRV-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
}

/**
 * Open to anyone, signed in or not.
 *
 * Someone whose only footprint is a lead row has the same s.13 right as an
 * account holder, and putting a login in front of the complaints channel
 * would put it furthest from the people most likely to need it.
 */
export async function submitGrievance(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = grievanceSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    category: formData.get("category"),
    details: formData.get("details"),
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  if (parsed.data.website) {
    return { ok: true, message: "Thanks — we've logged your complaint." };
  }

  const { ipAddress } = await requestMetadata();
  const limit = rateLimit(`grievance:${ipAddress ?? "unknown"}`, {
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!limit.ok) {
    return { ok: false, message: "Too many submissions. Try again shortly." };
  }

  const responseDueAt = new Date();
  responseDueAt.setDate(responseDueAt.getDate() + RIGHTS_SLA.grievanceDays);

  const reference = makeGrievanceReference();

  try {
    await db.insert(schema.grievances).values({
      reference,
      subjectEmail: parsed.data.email,
      subjectName: parsed.data.fullName,
      category: parsed.data.category,
      details: parsed.data.details,
      responseDueAt,
    });
  } catch (error) {
    console.error("[rights] grievance failed", error);
    return {
      ok: false,
      code: "server_error",
      message: "We couldn't log that just now. Please email us directly so it isn't lost:",
    };
  }

  return {
    ok: true,
    message: `Logged as ${reference}. The Grievance Officer will respond by ${responseDueAt.toLocaleDateString(
      "en-GB",
      { day: "numeric", month: "long", year: "numeric" },
    )}. Keep that reference — you'll need it if you escalate to the Data Protection Board.`,
  };
}
