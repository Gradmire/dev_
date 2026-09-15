/**
 * The consent registry: every purpose Gradmire processes personal data for,
 * with the exact wording shown when it was asked for.
 *
 * This file is the notice required by DPDP s.5. It lives in the repo rather
 * than the database on purpose — the obligation is to be able to show what a
 * person was told on a given date, and version control is already a better
 * record of that than a mutable `purposes` table would be.
 *
 * Changing the wording of a purpose means bumping its `version`. Rows in
 * `consent_records` pin the version they were captured under, so an old
 * consent never silently inherits new wording. Never edit a version in place
 * and never reuse a retired `key`.
 *
 * Safe to import from client components: text only, no secrets, no imports.
 */

export type PurposeKey =
  | "core_service"
  | "counselling_contact"
  | "marketing_email"
  | "university_sharing"
  | "service_improvement";

export type ConsentPurpose = {
  key: PurposeKey;
  /** Bumped whenever any wording below changes. */
  version: string;
  /** Short label on the checkbox. */
  label: string;
  /** The specific purpose, in the plain terms s.5(1) requires. */
  description: string;
  /** Exactly what is collected for this purpose. */
  dataCategories: string[];
  /** How long it is kept, and from when. Mirrored by the RoPA. */
  retention: string;
  /**
   * True where the purpose is the service itself. A required purpose is
   * still consented to, never pre-ticked — but withdrawing it means ending
   * the service, so the consent centre routes it to deletion rather than
   * offering a toggle that would leave an unusable half-account.
   */
  required: boolean;
};

export const CONSENT_PURPOSES: Record<PurposeKey, ConsentPurpose> = {
  core_service: {
    key: "core_service",
    version: "2026-09-15.1",
    label: "Handle my enquiry and application",
    description:
      "Store the details you give us so a counselor can answer your enquiry, build a course shortlist, and — if you go ahead — track your application through to a visa decision.",
    dataCategories: [
      "Name",
      "Email address",
      "Phone number (if you give one)",
      "Date of birth",
      "Course interest and preferred intake",
      "Anything you write in the message box",
    ],
    retention:
      "For as long as your application is live, then 24 months after your last contact with us.",
    required: true,
  },

  counselling_contact: {
    key: "counselling_contact",
    version: "2026-09-15.1",
    label: "Contact me about my enquiry",
    description:
      "Let a counselor reach you by email or phone about this enquiry and your application. This is only ever about your own enquiry — never a marketing message.",
    dataCategories: ["Email address", "Phone number (if you give one)"],
    retention: "Until your enquiry is closed, then 24 months.",
    required: true,
  },

  marketing_email: {
    key: "marketing_email",
    version: "2026-09-15.1",
    label: "Send me deadline reminders and course updates",
    description:
      "Email you application deadlines, intake reminders and new course guides for the subjects you told us you're interested in. You can stop these at any time from the link in any email, or from your consent settings — it takes one click and costs you nothing else.",
    dataCategories: ["Email address", "Subject interest"],
    retention: "Until you unsubscribe, then 6 months to honour the opt-out.",
    required: false,
  },

  university_sharing: {
    key: "university_sharing",
    version: "2026-09-15.1",
    label: "Share my profile with universities I shortlist",
    description:
      "Send your name, contact details and academic background to the specific universities on your shortlist, so they can assess you and respond. Nothing is sent to any university you have not shortlisted, and we never sell your details to anyone.",
    dataCategories: [
      "Name",
      "Email address",
      "Phone number",
      "Academic background you share with your counselor",
      "Course and intake you are applying for",
    ],
    retention:
      "Sent only at the point you shortlist a university. We keep a record of what was sent for 24 months.",
    required: false,
  },

  service_improvement: {
    key: "service_improvement",
    version: "2026-09-15.1",
    label: "Use my enquiry to improve Gradmire",
    description:
      "Look at enquiries in aggregate to work out which courses and guides to build next. Your name and contact details are stripped out before this analysis — only the course, intake and country remain.",
    dataCategories: ["Course interest", "Preferred intake", "Country"],
    retention: "Aggregated within 90 days; the identifiable copy is not kept for this purpose.",
    required: false,
  },
};

/** Stable display order wherever a set of purposes is rendered. */
export const PURPOSE_ORDER: PurposeKey[] = [
  "core_service",
  "counselling_contact",
  "marketing_email",
  "university_sharing",
  "service_improvement",
];

/** Which purposes each collection point asks about. */
export const FORM_PURPOSES = {
  consultation: [
    "core_service",
    "counselling_contact",
    "marketing_email",
    "university_sharing",
  ],
  signup: ["core_service", "counselling_contact", "marketing_email"],
  newsletter: ["marketing_email"],
} satisfies Record<string, PurposeKey[]>;

export type FormKey = keyof typeof FORM_PURPOSES;

export function purposesFor(form: FormKey): ConsentPurpose[] {
  return FORM_PURPOSES[form].map((k) => CONSENT_PURPOSES[k]);
}

export function isPurposeKey(value: string): value is PurposeKey {
  return value in CONSENT_PURPOSES;
}

/**
 * The version stamp written to `consent_records.notice_version`.
 *
 * Per purpose rather than one global version: a change to the marketing
 * wording should not invalidate — or appear to re-ask — consent for the
 * application purposes that did not change.
 */
export function noticeVersionFor(key: PurposeKey): string {
  return CONSENT_PURPOSES[key].version;
}
