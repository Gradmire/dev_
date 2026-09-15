import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

/** Where a destination sits in our rollout. Drives the "coming soon" state. */
export const destinationStatus = pgEnum("destination_status", [
  "live",
  "coming_soon",
]);

/** A course hub is either fully researched or a placeholder in the grid. */
export const hubStatus = pgEnum("hub_status", ["live", "stub"]);

/**
 * The real UK postgraduate journey, in order. Each value is a stage a
 * counselor moves an application into; applicants see the same list.
 */
export const applicationStage = pgEnum("application_stage", [
  "enquiry",
  "shortlisting",
  "documents_pending",
  "submitted",
  "offer_received",
  "offer_accepted",
  "cas_issued",
  "visa_applied",
  "visa_approved",
  "enrolled",
  "withdrawn",
]);

/** Lifecycle of an inbound consultation request. */
export const leadStatus = pgEnum("lead_status", [
  "new",
  "contacted",
  "consultation_booked",
  "converted",
  "closed",
]);

export const staffRole = pgEnum("staff_role", ["counselor", "admin"]);

/* ------------------------------------------------------------------ */
/* Content: destinations -> course hubs -> universities / deadlines     */
/* ------------------------------------------------------------------ */

export const destinations = pgTable(
  "destinations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    flagEmoji: text("flag_emoji"),
    stampLabel: text("stamp_label"),
    tagline: text("tagline"),
    status: destinationStatus("status").notNull().default("coming_soon"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("destinations_slug_idx").on(t.slug),
  }),
);

export const courseHubs = pgTable(
  "course_hubs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    /** Boarding-pass code shown on cards and the departures board, e.g. "BUS·MGT". */
    code: text("code").notNull(),
    name: text("name").notNull(),
    icon: text("icon"),
    status: hubStatus("status").notNull().default("stub"),
    sortOrder: integer("sort_order").notNull().default(0),

    oneLiner: text("one_liner"),
    overview: text("overview"),
    specializations: jsonb("specializations").$type<string[]>().default([]),

    tuitionMin: integer("tuition_min"),
    tuitionMax: integer("tuition_max"),
    livingCostMin: integer("living_cost_min"),
    livingCostMax: integer("living_cost_max"),
    currency: text("currency").notNull().default("GBP"),

    entryRequirements: jsonb("entry_requirements").$type<string[]>().default([]),
    ieltsMin: text("ielts_min"),
    ieltsMax: text("ielts_max"),

    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    topSectors: jsonb("top_sectors").$type<string[]>().default([]),
    commonEmployers: jsonb("common_employers").$type<string[]>().default([]),

    visaNotes: jsonb("visa_notes").$type<string[]>().default([]),
    graduateRouteYears: integer("graduate_route_years").default(2),
    /** "no" | "yes" | "per_course" — ATAS is course-specific for AI/ML and engineering. */
    atasRequirement: text("atas_requirement").notNull().default("no"),
    atasLeadTimeWeeks: integer("atas_lead_time_weeks"),

    accreditation: jsonb("accreditation").$type<string[]>().default([]),
    extraNote: text("extra_note"),

    /**
     * Provenance. Ranking and fee figures go stale annually and the launch
     * spec ships placeholders — without these there is no way to tell a
     * verified figure from a placeholder once it is on the page.
     */
    sources: jsonb("sources").$type<{ label: string; url?: string; year?: number }[]>().default([]),
    dataVerifiedAt: timestamp("data_verified_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex("course_hubs_dest_slug_idx").on(t.destinationId, t.slug),
    statusIdx: index("course_hubs_status_idx").on(t.status),
  }),
);

export const universities = pgTable(
  "universities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseHubId: uuid("course_hub_id")
      .notNull()
      .references(() => courseHubs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    school: text("school"),
    notableFor: text("notable_for"),
    subjectRank: text("subject_rank"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    hubIdx: index("universities_hub_idx").on(t.courseHubId),
  }),
);

export const deadlines = pgTable(
  "deadlines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseHubId: uuid("course_hub_id")
      .notNull()
      .references(() => courseHubs.id, { onDelete: "cascade" }),
    intake: text("intake").notNull(),
    label: text("label").notNull(),
    detail: text("detail"),
    warning: text("warning"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    hubIdx: index("deadlines_hub_idx").on(t.courseHubId),
  }),
);

/* ------------------------------------------------------------------ */
/* People: staff, applicants                                           */
/* ------------------------------------------------------------------ */

/**
 * Mirrors a Supabase auth.users row for someone on the Gradmire side.
 * Presence of a row here is what grants admin access.
 */
export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    role: staffRole("role").notNull().default("counselor"),
    specialization: text("specialization"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("staff_email_idx").on(t.email),
  }),
);

/**
 * A student. `authUserId` is null until they first sign in with a magic
 * link, so a counselor can create applications before the student has
 * ever logged in.
 */
export const applicants = pgTable(
  "applicants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUserId: uuid("auth_user_id"),
    email: text("email").notNull(),
    fullName: text("full_name"),
    phone: text("phone"),
    /**
     * Collected so the children's-data provisions (DPDP s.9, Rule 10) can be
     * applied. Nullable: every applicant created before this column existed,
     * and every one a counselor opens by hand, has no date of birth on file.
     * `null` is "unknown", never "adult" — see lib/consent/age.ts.
     */
    dateOfBirth: date("date_of_birth"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("applicants_email_idx").on(t.email),
    authIdx: index("applicants_auth_user_idx").on(t.authUserId),
  }),
);

/* ------------------------------------------------------------------ */
/* Applications + their status history                                 */
/* ------------------------------------------------------------------ */

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short human reference a counselor can quote on a call, e.g. "GM-4F2A". */
    reference: text("reference").notNull(),
    applicantId: uuid("applicant_id")
      .notNull()
      .references(() => applicants.id, { onDelete: "cascade" }),
    courseHubId: uuid("course_hub_id").references(() => courseHubs.id, {
      onDelete: "set null",
    }),
    universityName: text("university_name").notNull(),
    programmeName: text("programme_name").notNull(),
    intake: text("intake"),
    stage: applicationStage("stage").notNull().default("enquiry"),
    /** Counselor-only. Never returned to the applicant portal. */
    internalNotes: text("internal_notes"),
    /** Shown to the applicant on their status page. */
    applicantNote: text("applicant_note"),
    assignedStaffId: uuid("assigned_staff_id").references(() => staff.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    refIdx: uniqueIndex("applications_reference_idx").on(t.reference),
    applicantIdx: index("applications_applicant_idx").on(t.applicantId),
    stageIdx: index("applications_stage_idx").on(t.stage),
  }),
);

/** Append-only timeline. This is what the applicant portal renders. */
export const applicationEvents = pgTable(
  "application_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    stage: applicationStage("stage").notNull(),
    note: text("note"),
    createdByStaffId: uuid("created_by_staff_id").references(() => staff.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    appIdx: index("application_events_app_idx").on(t.applicationId),
  }),
);

/* ------------------------------------------------------------------ */
/* Inbound: consultation requests, newsletter                          */
/* ------------------------------------------------------------------ */

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    /** See applicants.dateOfBirth. Null means unknown, not adult. */
    dateOfBirth: date("date_of_birth"),
    courseHubId: uuid("course_hub_id").references(() => courseHubs.id, {
      onDelete: "set null",
    }),
    preferredIntake: text("preferred_intake"),
    message: text("message"),
    status: leadStatus("status").notNull().default("new"),
    /**
     * Who owns this enquiry. Null means it is still in the unclaimed intake
     * pool, which every counselor can see — an enquiry nobody can see is an
     * enquiry nobody answers. Once claimed it is visible only to the assignee
     * and to admins (lib/auth.ts, scopeToStaff).
     */
    assignedStaffId: uuid("assigned_staff_id").references(() => staff.id, {
      onDelete: "set null",
    }),
    /** Which page the form was submitted from, for attribution. */
    sourcePath: text("source_path"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    createdIdx: index("leads_created_idx").on(t.createdAt),
    statusIdx: index("leads_status_idx").on(t.status),
    assignedIdx: index("leads_assigned_idx").on(t.assignedStaffId),
  }),
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    courseHubId: uuid("course_hub_id").references(() => courseHubs.id, {
      onDelete: "set null",
    }),
    confirmed: boolean("confirmed").notNull().default(false),
    /**
     * Random, unguessable, and the only thing the unsubscribe link carries.
     * Withdrawal has to be as easy as consent was (DPDP s.6(4)), which rules
     * out making someone sign in to stop receiving email they never needed an
     * account to start receiving.
     */
    unsubscribeToken: text("unsubscribe_token"),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex("newsletter_email_idx").on(t.email),
  }),
);

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

export const destinationsRelations = relations(destinations, ({ many }) => ({
  courseHubs: many(courseHubs),
}));

export const courseHubsRelations = relations(courseHubs, ({ one, many }) => ({
  destination: one(destinations, {
    fields: [courseHubs.destinationId],
    references: [destinations.id],
  }),
  universities: many(universities),
  deadlines: many(deadlines),
}));

export const universitiesRelations = relations(universities, ({ one }) => ({
  courseHub: one(courseHubs, {
    fields: [universities.courseHubId],
    references: [courseHubs.id],
  }),
}));

export const deadlinesRelations = relations(deadlines, ({ one }) => ({
  courseHub: one(courseHubs, {
    fields: [deadlines.courseHubId],
    references: [courseHubs.id],
  }),
}));

export const applicantsRelations = relations(applicants, ({ many }) => ({
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  applicant: one(applicants, {
    fields: [applications.applicantId],
    references: [applicants.id],
  }),
  courseHub: one(courseHubs, {
    fields: [applications.courseHubId],
    references: [courseHubs.id],
  }),
  assignedStaff: one(staff, {
    fields: [applications.assignedStaffId],
    references: [staff.id],
  }),
  events: many(applicationEvents),
}));

export const applicationEventsRelations = relations(applicationEvents, ({ one }) => ({
  application: one(applications, {
    fields: [applicationEvents.applicationId],
    references: [applications.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  courseHub: one(courseHubs, {
    fields: [leads.courseHubId],
    references: [courseHubs.id],
  }),
  assignedStaff: one(staff, {
    fields: [leads.assignedStaffId],
    references: [staff.id],
  }),
}));

export const staffRelations = relations(staff, ({ many }) => ({
  assignedApplications: many(applications),
}));

/* ------------------------------------------------------------------ */
/* DPDP Act, 2023 — consent, children's data, data principal rights    */
/* ------------------------------------------------------------------ */

/**
 * Everything in this section keys off a lowercased email rather than a
 * foreign key, and that is deliberate.
 *
 * The same person reaches us through three unlinked doors: `leads` (no
 * account), `newsletter_subscribers` (no account), and `applicants` (an
 * account, eventually). Nothing joins those three today. A consent record or
 * an erasure request that pointed at one of them would silently miss the
 * other two, which is exactly the failure mode s.12 erasure cannot have.
 * Email is the only identifier all three share, so it is the join key — see
 * lib/rights/collect.ts, which is the one place that fan-out is implemented.
 */

/** Outcome of a parental consent request (DPDP s.9, Rule 10). */
export const parentalConsentStatus = pgEnum("parental_consent_status", [
  "pending",
  "verified",
  "declined",
  "expired",
]);

/** Lifecycle shared by the three data-principal request types. */
export const rightsRequestStatus = pgEnum("rights_request_status", [
  "received",
  "in_progress",
  "completed",
  "rejected",
]);

export const grievanceStatus = pgEnum("grievance_status", [
  "received",
  "in_progress",
  "resolved",
  "escalated",
]);

/**
 * Append-only consent ledger (DPDP s.6).
 *
 * A withdrawal is a new row with `granted = false`, never an update or a
 * delete — the obligation is to be able to prove what someone agreed to and
 * when, and an UPDATE destroys precisely that evidence. Current state is the
 * newest row per (subject_email, purpose_key); lib/consent/record.ts is the
 * only thing that should compute it.
 *
 * `notice_version` pins the exact wording shown at the time. The purpose text
 * lives in lib/consent/purposes.ts under version control, so a row here plus
 * that file reconstructs the screen the person actually saw.
 */
export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectEmail: text("subject_email").notNull(),
    /** Set once the person has an account; null for lead/newsletter consent. */
    authUserId: uuid("auth_user_id"),
    /** Key from CONSENT_PURPOSES in lib/consent/purposes.ts. */
    purposeKey: text("purpose_key").notNull(),
    granted: boolean("granted").notNull(),
    /** Version of the purpose's wording, from the same registry. */
    noticeVersion: text("notice_version").notNull(),
    /** Where the decision was made: a form path, or "consent-centre". */
    source: text("source"),
    /** Proof-of-consent metadata (Rule 3 read with s.6). */
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // The hot read is "newest row per purpose for this person".
    subjectIdx: index("consent_records_subject_idx").on(t.subjectEmail, t.purposeKey, t.createdAt),
  }),
);

/**
 * Verifiable parental consent for a data principal under 18 (Rule 10).
 *
 * Self-declaration plus a token emailed to the parent, which is what the
 * draft rules contemplate — no identity document is collected, and none
 * should be added here without a fresh look at s.8(4) data minimisation.
 */
export const parentalConsentRequests = pgTable(
  "parental_consent_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** The child, by the email they gave us. */
    subjectEmail: text("subject_email").notNull(),
    subjectName: text("subject_name"),
    /** Copied in at request time so an later DOB edit cannot rewrite history. */
    subjectDateOfBirth: date("subject_date_of_birth"),
    parentEmail: text("parent_email").notNull(),
    parentName: text("parent_name"),
    relationship: text("relationship"),
    /**
     * SHA-256 of the token in the emailed link. The plaintext is never
     * stored, so a read of this table does not let anyone consent as a parent.
     */
    tokenHash: text("token_hash").notNull(),
    status: parentalConsentStatus("status").notNull().default("pending"),
    /** Set when the parent ticks the declaration, with their own metadata. */
    declarationAcceptedAt: timestamp("declaration_accepted_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenIdx: uniqueIndex("parental_consent_token_idx").on(t.tokenHash),
    subjectIdx: index("parental_consent_subject_idx").on(t.subjectEmail),
  }),
);

/** Right to access, s.11. One row per export the person asked for. */
export const dataExportRequests = pgTable(
  "data_export_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectEmail: text("subject_email").notNull(),
    authUserId: uuid("auth_user_id"),
    status: rightsRequestStatus("status").notNull().default("received"),
    format: text("format").notNull().default("json"),
    /** Set when the bundle was actually handed over, for the audit trail. */
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    subjectIdx: index("data_export_requests_subject_idx").on(t.subjectEmail),
  }),
);

/**
 * Right to erasure, s.12(3).
 *
 * The request is recorded *before* anything is erased and deliberately
 * outlives the erasure: it is the only proof the obligation was discharged.
 * It holds no personal data beyond the email it was raised against.
 */
export const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectEmail: text("subject_email").notNull(),
    authUserId: uuid("auth_user_id"),
    status: rightsRequestStatus("status").notNull().default("received"),
    reason: text("reason"),
    /** What was actually erased, per table, as counts. Never row contents. */
    erasedSummary: jsonb("erased_summary").$type<Record<string, number>>(),
    /** What survived the erasure and on what legal footing. */
    retainedSummary: jsonb("retained_summary").$type<
      { table: string; rows: number; basis: string; until?: string }[]
    >(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    subjectIdx: index("deletion_requests_subject_idx").on(t.subjectEmail),
  }),
);

/**
 * Right to correction and completion, s.12(1)–(2).
 *
 * Only for fields the person cannot fix themselves — their own name, phone
 * and date of birth are editable directly in the account area, and routing
 * those through a queue would be slower than the right requires.
 */
export const correctionRequests = pgTable(
  "correction_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectEmail: text("subject_email").notNull(),
    authUserId: uuid("auth_user_id"),
    /** Free text: which record, and what is wrong with it. */
    details: text("details").notNull(),
    status: rightsRequestStatus("status").notNull().default("received"),
    resolutionNote: text("resolution_note"),
    handledByStaffId: uuid("handled_by_staff_id").references(() => staff.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    subjectIdx: index("correction_requests_subject_idx").on(t.subjectEmail),
    statusIdx: index("correction_requests_status_idx").on(t.status),
  }),
);

/**
 * Grievance redressal, s.13. Open to anyone, account or not — a person whose
 * only footprint is a lead row still has this right, and requiring a login
 * would put it out of reach of exactly the people most likely to need it.
 */
export const grievances = pgTable(
  "grievances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short quotable reference, e.g. "GRV-7C21". */
    reference: text("reference").notNull(),
    subjectEmail: text("subject_email").notNull(),
    subjectName: text("subject_name"),
    category: text("category").notNull(),
    details: text("details").notNull(),
    status: grievanceStatus("status").notNull().default("received"),
    /** Stamped at insert from the published SLA, so a later SLA change
     *  cannot retroactively move a deadline that was already promised. */
    responseDueAt: timestamp("response_due_at", { withTimezone: true }).notNull(),
    resolutionNote: text("resolution_note"),
    handledByStaffId: uuid("handled_by_staff_id").references(() => staff.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    refIdx: uniqueIndex("grievances_reference_idx").on(t.reference),
    subjectIdx: index("grievances_subject_idx").on(t.subjectEmail),
    statusIdx: index("grievances_status_idx").on(t.status),
  }),
);

/**
 * Right to nominate, s.14 — someone who may exercise these rights on the
 * person's behalf if they die or are incapacitated. At most one live
 * nomination per person; replacing it overwrites the row.
 */
export const nominations = pgTable(
  "nominations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectEmail: text("subject_email").notNull(),
    authUserId: uuid("auth_user_id"),
    nomineeName: text("nominee_name").notNull(),
    nomineeEmail: text("nominee_email").notNull(),
    nomineeRelationship: text("nominee_relationship"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    subjectIdx: uniqueIndex("nominations_subject_idx").on(t.subjectEmail),
  }),
);

/* ------------------------------------------------------------------ */
/* Audit — who touched personal data (DPDP s.8(5))                     */
/* ------------------------------------------------------------------ */

export const accessActorType = pgEnum("access_actor_type", [
  "staff",
  "data_principal",
  "system",
]);

/**
 * Append-only record of access to personal data.
 *
 * There was no trace of this at all: nothing recorded that a counselor had
 * opened the lead list, and nothing recorded that anyone had exported a
 * person's whole record. Without it a breach cannot be scoped — the first
 * question after "what was taken" is "who read it and when", and the honest
 * answer was that we could not say.
 *
 * Deliberately records the *shape* of an access, never its content: a subject
 * email and a row count, never the rows. An audit log that copies the
 * personal data it is auditing doubles the exposure it exists to detect.
 */
export const accessLogs = pgTable(
  "access_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: accessActorType("actor_type").notNull(),
    /** Staff id, or the auth user id of a person reading their own record. */
    actorId: uuid("actor_id"),
    actorEmail: text("actor_email"),
    /** Verb: "list", "view", "export", "erase", "update", "consent_read". */
    action: text("action").notNull(),
    /** Table or surface touched, e.g. "leads", "applications", "consent_records". */
    resourceType: text("resource_type").notNull(),
    /** Single-row accesses only; null for a list. */
    resourceId: text("resource_id"),
    /** Whose data it was, where that is one identifiable person. */
    subjectEmail: text("subject_email"),
    /** How many rows were returned. The blast radius of a list read. */
    rowCount: integer("row_count"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    actorIdx: index("access_logs_actor_idx").on(t.actorId, t.createdAt),
    subjectIdx: index("access_logs_subject_idx").on(t.subjectEmail),
    createdIdx: index("access_logs_created_idx").on(t.createdAt),
  }),
);
