# Record of Processing Activities (RoPA)

Gradmire — DPDP Act, 2023. Maintained as a living document: **a change to
`src/db/schema.ts` that adds or removes personal data is not finished until
this file matches it.**

- **Data Fiduciary:** Gradmire
- **Grievance Officer:** set via `NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME` / `_EMAIL` (`src/config/site.ts`)
- **Last reviewed:** 15 September 2026
- **Status:** consent, data principal rights, security safeguards, breach readiness and documentation implemented. Outstanding items are the DPAs and the off-system document handling in §8.

> Purpose wording, data categories and retention periods are defined in code at
> `src/lib/consent/purposes.ts` and are the authoritative version. This document
> records the processing; that file records what the data principal was told.

---

## 1. Consultation enquiries

| | |
|---|---|
| **Purpose** | `core_service`, `counselling_contact` — answer an enquiry and build a course shortlist |
| **Legal basis** | Consent (s.6), captured at submission |
| **Data categories** | Name, email, phone, date of birth, course interest, preferred intake, free-text message, originating page |
| **Where** | `leads` (Supabase Postgres, ap-southeast-1) |
| **Collected by** | `src/components/forms/consultation-form.tsx` → `submitConsultation` |
| **Retention** | 24 months from last contact |
| **Processors** | Supabase, Vercel |
| **Children** | Date of birth collected; under-18 enquiries gated — see §6 |

## 2. Applicant accounts

| | |
|---|---|
| **Purpose** | `core_service` — operate the applicant portal |
| **Legal basis** | Consent (s.6) |
| **Data categories** | Name, email, phone, date of birth, Supabase auth user id |
| **Where** | `applicants`; authentication records in Supabase `auth.users` |
| **Collected by** | `signUp` (`src/lib/actions/auth.ts`), or a counselor via `createApplication` |
| **Retention** | Life of the account, then 24 months |
| **Processors** | Supabase (auth + database), Vercel |

> **Note — third-party collection.** `createApplication` lets a counselor create
> an applicant record from a phone call, before that person has any account.
> They receive no notice at the point of collection. **Open item:** issue a s.5
> notice on first contact for counselor-created records.

## 3. Applications and counselor notes

| | |
|---|---|
| **Purpose** | `core_service` — manage an application from shortlist to visa |
| **Legal basis** | Consent (s.6) |
| **Data categories** | University, programme, intake, stage, applicant-facing note, **counselor internal notes (free text)**, stage timeline |
| **Where** | `applications`, `application_events` |
| **Retention** | Life of the application, then 24 months. Enrolled applications: anonymised and kept 8 years as a financial record |
| **Access** | Included in the s.11 export — see `EXPORT_INCLUDES_INTERNAL_NOTES` in `src/lib/rights/collect.ts` |

## 4. Newsletter / deadline reminders

| | |
|---|---|
| **Purpose** | `marketing_email` |
| **Legal basis** | Consent (s.6), withdrawable in one click |
| **Data categories** | Email, subject interest |
| **Where** | `newsletter_subscribers` |
| **Withdrawal** | `/unsubscribe?token=…` (no sign-in) or `/account/consent` |
| **Retention** | Until unsubscribe, then 6 months to honour the opt-out |

> **Open item — double opt-in.** Subscription is single opt-in: the consent
> checkbox sets `confirmed = true` directly. A confirmation email is the better
> answer and is blocked on there being a mailer configured at all. Revisit once
> `RESEND_API_KEY` is set in production.

## 5. Consent records

| | |
|---|---|
| **Purpose** | Demonstrate lawful basis (s.6) |
| **Data categories** | Email, purpose key, decision, notice version, source, IP address, user agent |
| **Where** | `consent_records` — append-only |
| **Retention** | 5 years; pseudonymised on erasure |

## 6. Children's data — parental consent

| | |
|---|---|
| **Purpose** | Verifiable parental consent (s.9, Rule 10) |
| **Legal basis** | Consent of parent/guardian |
| **Data categories** | Child's name, email, date of birth; **parent's name, email, relationship**; IP and user agent of the decision |
| **Where** | `parental_consent_requests` |
| **Method** | Self-declaration + single-use token emailed to the guardian. **No identity document is collected.** |
| **Enforcement** | `mayProgressBeyondEnquiry` — gate in `updateApplicationStage` |
| **Retention** | 5 years; pseudonymised on erasure |
| **Note** | s.9(3) prohibits behavioural advertising to children. Gradmire runs no advertising or analytics of any kind — see §9. |

## 7. Data principal rights requests

| | |
|---|---|
| **Purpose** | Discharge ss.11–14 |
| **Data categories** | Email, request details, status, resolution, IP address |
| **Where** | `data_export_requests`, `deletion_requests`, `correction_requests`, `grievances`, `nominations` |
| **Retention** | 5 years; pseudonymised on erasure, except `nominations` which is deleted outright (it holds a third party's contact details) |
| **SLA** | Correction 15 days / grievance 30 days — see `src/config/site.ts` |

## 7a. Access logs

| | |
|---|---|
| **Purpose** | Detect and investigate unauthorised access (s.8(5)); scope a breach |
| **Legal basis** | Legitimate use — security of the fiduciary's own systems |
| **Data categories** | Actor id and email, action, resource type, subject email, row count, IP address. **Never row contents.** |
| **Where** | `access_logs` |
| **Written by** | `src/lib/audit.ts` — admin surfaces, the s.11 export, and erasure |
| **Retention** | 18 months, purged nightly |
| **Read by** | Admins only, at `/admin/privacy`. Reading it is itself logged. |

## 7b. Staff access scoping

| | |
|---|---|
| **Rule** | A counselor sees only the leads and applications assigned to them, plus the unclaimed intake pool. Admins see everything. |
| **Enforced by** | `scopeToStaff` / `mayActOn` (`src/lib/auth.ts`), applied on both reads and writes |
| **Admin-only surfaces** | `/admin/privacy` (consent ledger, rights queue, audit trail), `/admin/courses` |
| **Note** | The intake pool is a deliberate, documented exception — see `scopeToStaff`. An unassigned enquiry visible to nobody is an enquiry nobody answers. |

## 8. ⚠️ Off-system document handling — MANUAL PROCESS

**This is the highest-risk processing Gradmire carries out and there is no code
for it. It is recorded here precisely so that it is not invisible.**

| | |
|---|---|
| **Purpose** | Collect and forward the documents a UK application requires |
| **Legal basis** | Consent (s.6) — **currently captured only in-conversation, not recorded** |
| **Data categories** | **Passport scans, academic transcripts, degree certificates, IELTS/TOEFL results, financial statements, CAS letters, visa correspondence.** Passport and financial data are the most sensitive personal data the business touches. |
| **Where** | Counselor email inboxes and messaging apps (WhatsApp). **Not in any Gradmire system.** No database row, no access log, no retention timer, no erasure path. |
| **Evidence it exists** | The `application_stage` enum includes `documents_pending`, `cas_issued`, `visa_applied` — the pipeline assumes these documents are being handled somewhere. |
| **Processors** | Whichever email provider and messaging platform each counselor uses — **unmapped, and no DPA in place with any of them** |
| **Cross-border** | Unknown and uncontrolled; consumer messaging platforms replicate globally |

### Required manual procedure

Until this is brought into a system, every counselor must follow this, and
compliance with it must be spot-checked quarterly:

1. **Collection.** Documents are requested only over email, never a messaging
   app. State the purpose in the request and link the privacy policy.
2. **Storage.** Move attachments to the designated shared drive folder for that
   applicant on receipt; delete the mail copy, including from Trash/Bin.
3. **Access.** Only the assigned counselor and an admin. No forwarding to a
   personal account, and no local copies on personal devices.
4. **Onward transfer.** Documents go only to universities the applicant has
   shortlisted, under the `university_sharing` consent purpose. Log what was
   sent, to whom, and when, in the application's internal notes.
5. **Retention.** Delete **12 months after the application closes** (enrolled,
   withdrawn, or refused), from the shared drive and every mail folder.
6. **Erasure requests.** When a deletion request completes in the app, the
   assigned counselor must also purge the shared drive folder and mail archive
   within 7 days, and confirm it in writing to the Grievance Officer. **The
   automated erasure in `src/lib/rights/collect.ts` does not and cannot reach
   these files.**
7. **Breach.** Loss or misdirection of a passport scan is a reportable breach.
   Escalate to the Grievance Officer immediately — the 72-hour clock starts on
   becoming aware.

### Open items

- [ ] Decide whether to bring document handling in-app (encrypted object storage with access logging) or formalise the shared drive with a DPA and audit logging.
- [ ] Execute DPAs with the email and storage providers actually in use.
- [ ] Record the consent for document collection somewhere durable, rather than in conversation.
- [ ] Ban document exchange over consumer messaging apps in writing, and enforce it.

## 9. What Gradmire does *not* do

Recorded because it is a compliance asset, and because a future change here
must be a deliberate decision rather than an accident:

- **No analytics of any kind.** No Google Analytics, GTM, Meta Pixel, PostHog, Sentry, or similar. Verified across `src/`.
- **No advertising or behavioural tracking.** Relevant to s.9(3) (children).
- **No payment processing.** No gateway, no card data.
- **No CRM or chat widget.**
- **No tracking cookies.** Only Supabase session cookies, on `/portal`, `/account`, `/admin`, `/login`, `/signup`, `/auth`. **No cookie banner is required.**
- **Google Fonts are self-hosted** at build time by `next/font/google` — no runtime request from the visitor to Google, and therefore no transfer. Do not "optimise" this into a CDN link.
- **`localStorage`** holds only course slugs for the deadline tracker, on-device, never transmitted.

---

## Processors

| Processor | Role | Data | Location | DPA (Rule 6) |
|---|---|---|---|---|
| **Supabase Inc.** | Auth, Postgres, magic-link email | All of it | Singapore (AWS ap-southeast-1) | ❌ **Required** |
| **Vercel Inc.** | Hosting, compute, request logs (IPs) | All of it, in transit; IPs in logs | Singapore (sin1) | ❌ **Required** |
| **Resend (Plus Five Five, Inc.)** | Transactional email — parental consent, breach alerts | Parent email, child name | US | ❌ **Required before enabling** |
| placehold.co | Placeholder images | Visitor IP + user agent, at request time | — | Low risk; self-host to remove |
| images.unsplash.com | Campus imagery | Visitor IP + user agent, at request time | — | Low risk; self-host to remove |
| *Unmapped email / messaging* | **Document handling — see §8** | **Passports, transcripts, financials** | **Unknown** | ❌ **Urgent** |

### Data Processing Agreements — required under Rule 6

Rule 6 requires a contract with every processor before they touch personal
data. None are in place. Named, in priority order:

- [ ] **Supabase Inc.** — DPA + sub-processor list (AWS). Highest priority: holds everything.
- [ ] **Vercel Inc.** — DPA. Request logs contain IP addresses.
- [ ] **Resend** — DPA **before** `RESEND_API_KEY` is set in production. Until it is set, no personal data reaches them.
- [ ] **Email/storage provider for documents** — see §8. Cannot be executed until the provider is actually identified.

Each needs: purpose limitation, a confirmed sub-processor list, breach
notification back to us fast enough to keep our own 72-hour clock, deletion on
termination, and audit rights.

### Encryption posture

| Layer | Status |
|---|---|
| Browser → Vercel | TLS, HSTS preload (`next.config.mjs`) |
| Vercel → Postgres | TLS with **certificate verification against a pinned Supabase root CA** (`src/db/index.ts`). Note: `sslmode=require` alone would encrypt without verifying — see the comment there. |
| At rest | Supabase volume encryption (AES-256) |
| Application-level field encryption | **None.** Acceptable while no passport or financial data is in the database — revisit the moment §8 documents move in-app. |
| Tokens | Parental consent tokens stored as SHA-256; plaintext exists only in the email |

## Cross-border transfer (s.16)

All personal data is processed in **Singapore**, not India. Transfer is
permitted — the Central Government has notified no restricted countries — but
must be disclosed. Declared in `DATA_LOCATIONS` (`src/config/site.ts`) and
surfaced in the privacy policy.

## Significant Data Fiduciary (s.10)

Not currently triggered at present volume. No DPIA, independent auditor or
Data Protection Officer obligation. **Re-assess if volume grows materially.**
