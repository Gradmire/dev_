"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireStaff, requireAdmin, mayActOn } from "@/lib/auth";
import { logStaffAccess } from "@/lib/audit";
import { mayProgressBeyondEnquiry } from "@/lib/consent/parental";
import { CONTENT_TAG } from "@/lib/queries";
import type { FormState } from "@/lib/actions/consultation";

const stageValues = schema.applicationStage.enumValues;
const leadStatusValues = schema.leadStatus.enumValues;

/** Short, quotable reference: GM-<4 hex>. Collisions retry on the unique index. */
function makeReference() {
  return `GM-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
}

export async function updateLeadStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireStaff();

  const parsed = z
    .object({
      leadId: z.string().uuid(),
      status: z.enum(leadStatusValues),
    })
    .safeParse({
      leadId: formData.get("leadId"),
      status: formData.get("status"),
    });

  if (!parsed.success) return { ok: false, message: "Invalid status change." };

  // The list hides other counselors' leads; this stops a hidden id from
  // still working when it is posted directly. Scoping a read without
  // scoping the matching write is not scoping.
  const lead = await db.query.leads.findFirst({
    where: eq(schema.leads.id, parsed.data.leadId),
    columns: { id: true, assignedStaffId: true, email: true },
  });
  if (!lead) return { ok: false, message: "That enquiry no longer exists." };
  if (!mayActOn(context, lead.assignedStaffId, { allowUnassigned: true })) {
    return { ok: false, message: "That enquiry belongs to another counselor." };
  }

  try {
    await db
      .update(schema.leads)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(schema.leads.id, parsed.data.leadId));
  } catch (error) {
    console.error("[admin] updateLeadStatus failed", error);
    return { ok: false, message: "Couldn't update that lead. Try again." };
  }

  await logStaffAccess(context, {
    action: "update",
    resourceType: "leads",
    resourceId: parsed.data.leadId,
    subjectEmail: lead.email,
  });

  revalidatePath("/admin/leads");
  return { ok: true, message: "Lead updated." };
}

/**
 * Takes an unclaimed enquiry out of the shared intake pool.
 *
 * Claiming is what turns the pool's broad visibility into ownership: once
 * assigned, the enquiry disappears from every other counselor's list. A lead
 * that already has an owner cannot be claimed out from under them — only an
 * admin can reassign.
 */
export async function claimLead(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireStaff();

  const parsed = z
    .object({ leadId: z.string().uuid() })
    .safeParse({ leadId: formData.get("leadId") });
  if (!parsed.success) return { ok: false, message: "Invalid enquiry." };

  const lead = await db.query.leads.findFirst({
    where: eq(schema.leads.id, parsed.data.leadId),
    columns: { id: true, assignedStaffId: true, email: true },
  });
  if (!lead) return { ok: false, message: "That enquiry no longer exists." };
  if (lead.assignedStaffId && lead.assignedStaffId !== context.staff.id) {
    return { ok: false, message: "Another counselor already claimed that one." };
  }

  try {
    await db
      .update(schema.leads)
      .set({ assignedStaffId: context.staff.id, updatedAt: new Date() })
      .where(eq(schema.leads.id, parsed.data.leadId));
  } catch (error) {
    console.error("[admin] claimLead failed", error);
    return { ok: false, message: "Couldn't claim that enquiry. Try again." };
  }

  await logStaffAccess(context, {
    action: "update",
    resourceType: "leads",
    resourceId: parsed.data.leadId,
    subjectEmail: lead.email,
  });

  revalidatePath("/admin/leads");
  return { ok: true, message: "Claimed. It's yours now." };
}

/**
 * Moves an application to a new stage and records the move on its timeline.
 * The event row is what the applicant portal renders, so the two are written
 * together rather than the stage alone.
 */
export async function updateApplicationStage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireStaff();
  const { staff } = context;

  const parsed = z
    .object({
      applicationId: z.string().uuid(),
      stage: z.enum(stageValues),
      note: z.string().trim().max(500).optional(),
      applicantNote: z.string().trim().max(500).optional(),
    })
    .safeParse({
      applicationId: formData.get("applicationId"),
      stage: formData.get("stage"),
      note: formData.get("note") ?? undefined,
      applicantNote: formData.get("applicantNote") ?? undefined,
    });

  if (!parsed.success) return { ok: false, message: "Invalid stage change." };

  const { applicationId, stage, note, applicantNote } = parsed.data;

  // Write-side ownership check, matching the scoping on the list.
  const owned = await db.query.applications.findFirst({
    where: eq(schema.applications.id, applicationId),
    columns: { id: true, assignedStaffId: true },
  });
  if (!owned) return { ok: false, message: "That application no longer exists." };
  if (!mayActOn(context, owned.assignedStaffId, { allowUnassigned: true })) {
    return { ok: false, message: "That application belongs to another counselor." };
  }

  /*
   * Children's data gate (DPDP s.9, Rule 10).
   *
   * An under-18 applicant may sit at `enquiry` — holding the enquiry is what
   * lets us contact their guardian in the first place — and may not move past
   * it until that guardian confirms. Enforced here rather than in the admin UI
   * because this action is the only way a stage ever changes, and a rule that
   * lives in a form can be walked around by a second form.
   *
   * `withdrawn` is exempt: stopping work on a child's application is the
   * conservative direction, and blocking it would trap the record.
   */
  if (stage !== "enquiry" && stage !== "withdrawn") {
    const application = await db.query.applications.findFirst({
      where: eq(schema.applications.id, applicationId),
      columns: { id: true },
      with: { applicant: { columns: { email: true, dateOfBirth: true } } },
    });

    if (application?.applicant) {
      const { allowed, gate } = await mayProgressBeyondEnquiry(
        application.applicant.email,
        application.applicant.dateOfBirth,
      );
      if (!allowed) {
        const detail =
          gate.state === "pending"
            ? `We're waiting on ${gate.parentEmail}.`
            : gate.state === "declined"
              ? "Their guardian declined permission."
              : gate.state === "expired"
                ? "The guardian's link expired — send a new one."
                : "No guardian permission has been requested yet.";
        return {
          ok: false,
          message: `This applicant is under 18, so their application can't move past Enquiry until a parent or guardian confirms. ${detail}`,
        };
      }
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(schema.applications)
        .set({
          stage,
          applicantNote: applicantNote || null,
          updatedAt: new Date(),
        })
        .where(eq(schema.applications.id, applicationId));

      await tx.insert(schema.applicationEvents).values({
        applicationId,
        stage,
        note: note || null,
        createdByStaffId: staff.id,
      });
    });
  } catch (error) {
    console.error("[admin] updateApplicationStage failed", error);
    return { ok: false, message: "Couldn't move that application. Try again." };
  }

  await logStaffAccess(context, {
    action: "update",
    resourceType: "applications",
    resourceId: applicationId,
  });

  revalidatePath("/admin/applications");
  revalidatePath("/portal");
  return { ok: true, message: "Stage updated. The applicant can see it now." };
}

/**
 * Creates an applicant (or reuses one by email) plus their first application.
 * This is how a student gets something to log in and look at.
 */
export async function createApplication(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireStaff();
  const { staff } = context;

  const parsed = z
    .object({
      email: z.string().trim().toLowerCase().email(),
      fullName: z.string().trim().min(2).max(120),
      universityName: z.string().trim().min(2).max(160),
      programmeName: z.string().trim().min(2).max(160),
      intake: z.string().trim().max(60).optional(),
      courseHubId: z.string().uuid().optional().or(z.literal("")),
    })
    .safeParse({
      email: formData.get("email"),
      fullName: formData.get("fullName"),
      universityName: formData.get("universityName"),
      programmeName: formData.get("programmeName"),
      intake: formData.get("intake") ?? undefined,
      courseHubId: formData.get("courseHubId") ?? "",
    });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, fullName, universityName, programmeName, intake, courseHubId } =
    parsed.data;

  try {
    const [applicant] = await db
      .insert(schema.applicants)
      .values({ email, fullName })
      .onConflictDoUpdate({
        target: schema.applicants.email,
        set: { fullName, updatedAt: new Date() },
      })
      .returning({ id: schema.applicants.id });

    await db.transaction(async (tx) => {
      const [app] = await tx
        .insert(schema.applications)
        .values({
          reference: makeReference(),
          applicantId: applicant.id,
          courseHubId: courseHubId || null,
          universityName,
          programmeName,
          intake: intake || null,
          stage: "enquiry",
          assignedStaffId: staff.id,
        })
        .returning({ id: schema.applications.id });

      await tx.insert(schema.applicationEvents).values({
        applicationId: app.id,
        stage: "enquiry",
        note: "Application opened.",
        createdByStaffId: staff.id,
      });

      return app.id;
    });

    await logStaffAccess(context, {
      action: "update",
      resourceType: "applicants",
      subjectEmail: email,
    });

    revalidatePath("/admin/applications");
    return {
      ok: true,
      message: `Application created. ${email} can now sign in to track it.`,
    };
  } catch (error) {
    console.error("[admin] createApplication failed", error);
    return { ok: false, message: "Couldn't create that application. Try again." };
  }
}

/** Edits the figures that go stale — fees, salaries, verification date. */
export async function updateCourseHub(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // Course content is published, business-wide data rather than one
  // counselor's caseload: an edit here changes what every visitor sees, so it
  // sits with admins alongside the other cross-cutting surfaces.
  await requireAdmin();

  const num = (v: FormDataEntryValue | null) => {
    if (v == null || v === "") return null;
    const n = Number(String(v).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? Math.round(n) : null;
  };

  const parsed = z
    .object({ hubId: z.string().uuid(), status: z.enum(schema.hubStatus.enumValues) })
    .safeParse({ hubId: formData.get("hubId"), status: formData.get("status") });

  if (!parsed.success) return { ok: false, message: "Invalid course hub." };

  const markVerified = formData.get("markVerified") === "on";

  try {
    await db
      .update(schema.courseHubs)
      .set({
        status: parsed.data.status,
        oneLiner: (formData.get("oneLiner") as string) || null,
        overview: (formData.get("overview") as string) || null,
        tuitionMin: num(formData.get("tuitionMin")),
        tuitionMax: num(formData.get("tuitionMax")),
        livingCostMin: num(formData.get("livingCostMin")),
        livingCostMax: num(formData.get("livingCostMax")),
        salaryMin: num(formData.get("salaryMin")),
        salaryMax: num(formData.get("salaryMax")),
        ...(markVerified ? { dataVerifiedAt: new Date() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.courseHubs.id, parsed.data.hubId));
  } catch (error) {
    console.error("[admin] updateCourseHub failed", error);
    return { ok: false, message: "Couldn't save those changes. Try again." };
  }

  // Content is cached by tag across requests; drop it so the public pages
  // pick the edit up on their next request rather than after the TTL.
  revalidateTag(CONTENT_TAG);
  revalidatePath("/admin/courses");

  return { ok: true, message: "Saved. Live pages will refresh on next request." };
}

/* ------------------------------------------------------------------ */
/* Data principal requests — admin only                                */
/* ------------------------------------------------------------------ */

/**
 * Closes a correction request (s.12).
 *
 * Admin-only, like everything on the privacy surface: a correction request
 * names a person who may be nobody's assigned caseload, and working it means
 * reading across counselors.
 */
export async function resolveCorrectionRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireAdmin();

  const parsed = z
    .object({
      requestId: z.string().uuid(),
      resolutionNote: z.string().trim().min(3).max(1000),
    })
    .safeParse({
      requestId: formData.get("requestId"),
      resolutionNote: formData.get("resolutionNote"),
    });

  if (!parsed.success) return { ok: false, message: "Add a note describing the fix." };

  try {
    await db
      .update(schema.correctionRequests)
      .set({
        status: "completed",
        resolutionNote: parsed.data.resolutionNote,
        handledByStaffId: context.staff.id,
        completedAt: new Date(),
      })
      .where(eq(schema.correctionRequests.id, parsed.data.requestId));
  } catch (error) {
    console.error("[admin] resolveCorrectionRequest failed", error);
    return { ok: false, message: "Couldn't save that. Try again." };
  }

  await logStaffAccess(context, {
    action: "update",
    resourceType: "correction_requests",
    resourceId: parsed.data.requestId,
  });

  revalidatePath("/admin/privacy");
  revalidatePath("/account/data");
  return { ok: true, message: "Marked done. The person can see the note." };
}

/**
 * Records the response to a grievance (s.13).
 *
 * `resolvedAt` is stamped but `responseDueAt` is never touched — the deadline
 * was published to the complainant when they submitted, and a record that
 * could move it afterwards would not be evidence of anything.
 */
export async function resolveGrievance(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await requireAdmin();

  const parsed = z
    .object({
      grievanceId: z.string().uuid(),
      resolutionNote: z.string().trim().min(3).max(2000),
    })
    .safeParse({
      grievanceId: formData.get("grievanceId"),
      resolutionNote: formData.get("resolutionNote"),
    });

  if (!parsed.success) return { ok: false, message: "Add a note describing the response." };

  try {
    await db
      .update(schema.grievances)
      .set({
        status: "resolved",
        resolutionNote: parsed.data.resolutionNote,
        handledByStaffId: context.staff.id,
        resolvedAt: new Date(),
      })
      .where(eq(schema.grievances.id, parsed.data.grievanceId));
  } catch (error) {
    console.error("[admin] resolveGrievance failed", error);
    return { ok: false, message: "Couldn't save that. Try again." };
  }

  await logStaffAccess(context, {
    action: "update",
    resourceType: "grievances",
    resourceId: parsed.data.grievanceId,
  });

  revalidatePath("/admin/privacy");
  return { ok: true, message: "Response recorded." };
}
