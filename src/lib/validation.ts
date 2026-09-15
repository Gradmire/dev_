import { z } from "zod";
import { dateOfBirthBounds } from "@/lib/consent/age";

/** UK/international-friendly: digits, spaces, +, -, (), 7–20 chars. */
const phone = z
  .string()
  .trim()
  .regex(/^[+()\-\s\d]{7,20}$/, "Enter a phone number we can reach you on");

/**
 * Date of birth, collected so the children's-data provisions can be applied
 * (DPDP s.9). Optional at the schema level and required in the forms: an
 * applicant a counselor creates by phone has no date of birth, and rejecting
 * those would close the flow the business actually runs on.
 *
 * Bounded at both ends — a future date, or one 100 years back, is a typo, and
 * `ageOn` would have to fall back to "unknown" for it, which is the one
 * answer that quietly skips the parental consent gate.
 */
const dateOfBirth = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth")
  .refine((value) => {
    const { min, max } = dateOfBirthBounds();
    return value >= min && value <= max;
  }, "Enter a real date of birth");

export const consultationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(120, "That name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter an email address we can reply to")
    .max(255),
  phone: phone.optional().or(z.literal("")),
  dateOfBirth: dateOfBirth.optional().or(z.literal("")),
  courseHubSlug: z.string().trim().max(120).optional().or(z.literal("")),
  preferredIntake: z.string().trim().max(60).optional().or(z.literal("")),
  message: z.string().trim().max(2000, "Keep it under 2000 characters").optional(),
  sourcePath: z.string().trim().max(255).optional(),
  /** Hidden field. Bots fill it in; humans never see it. */
  website: z.string().max(0, "Rejected").optional(),
});

export type ConsultationInput = z.infer<typeof consultationSchema>;

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
  courseHubSlug: z.string().trim().max(120).optional().or(z.literal("")),
  website: z.string().max(0).optional(),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(120, "That name is too long"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter an email address we can reply to")
    .max(255),
  dateOfBirth: dateOfBirth.optional().or(z.literal("")),
  /** Hidden field. Bots fill it in; humans never see it. */
  website: z.string().max(0, "Rejected").optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

/* ------------------------------------------------------------------ */
/* DPDP — parental consent, data principal rights                      */
/* ------------------------------------------------------------------ */

const email255 = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(255);

/**
 * Details of the parent or guardian whose permission is sought (Rule 10).
 * Self-declaration plus an emailed token; no identity document is asked for,
 * and none should be added without revisiting s.8(4) minimisation.
 */
export const parentalConsentRequestSchema = z.object({
  subjectEmail: email255,
  parentEmail: email255,
  parentName: z.string().trim().min(2, "Enter their name").max(120),
  relationship: z
    .string()
    .trim()
    .min(2, "Tell us how they are related to you")
    .max(60),
});

export const parentalDeclarationSchema = z.object({
  token: z.string().trim().min(10).max(200),
  decision: z.enum(["grant", "decline"]),
  /** Ticked by the parent: they are the guardian and they are an adult. */
  declaration: z.literal("on", { message: "Tick the declaration to continue" }).optional(),
});

export const correctionRequestSchema = z.object({
  details: z
    .string()
    .trim()
    .min(10, "Tell us what's wrong and what it should say")
    .max(2000, "Keep it under 2000 characters"),
});

export const deletionRequestSchema = z.object({
  reason: z.string().trim().max(500).optional().or(z.literal("")),
  /** Typed confirmation — a destructive, irreversible action needs intent. */
  confirmation: z
    .string()
    .trim()
    .refine((v) => v.toUpperCase() === "DELETE", "Type DELETE to confirm"),
});

export const GRIEVANCE_CATEGORIES = [
  "Access or export of my data",
  "Correction of my data",
  "Deletion of my data",
  "Consent or marketing emails",
  "Children's data / parental consent",
  "A data breach",
  "Something else",
] as const;

export const grievanceSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  email: email255,
  category: z.enum(GRIEVANCE_CATEGORIES, { message: "Choose a category" }),
  details: z
    .string()
    .trim()
    .min(20, "Give us enough detail to investigate")
    .max(4000, "Keep it under 4000 characters"),
  website: z.string().max(0, "Rejected").optional(),
});

export const nominationSchema = z.object({
  nomineeName: z.string().trim().min(2, "Enter their full name").max(120),
  nomineeEmail: email255,
  nomineeRelationship: z.string().trim().max(60).optional().or(z.literal("")),
});

/** The fields a person may correct on their own record without a queue. */
export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  phone: phone.optional().or(z.literal("")),
  dateOfBirth: dateOfBirth.optional().or(z.literal("")),
});
