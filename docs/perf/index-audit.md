# Index audit — September 2026

Every column used in a `WHERE`, `JOIN` or `ORDER BY` across `src/`, checked
against `pg_indexes` in production.

**Calibration:** production holds 1 lead, 0 applications, 0 applicants, 18
universities, 8 course hubs. **No index below changes a measured timing
today** — Postgres correctly sequential-scans a single-row table. These close
structural gaps so the access path is right as tables grow. The high
`seq_scan` counters on `destinations` (129) and `course_hubs` (33) are the
planner making the correct choice on 4–8 row tables, not a problem to fix.

## Already indexed — no action

| Column | Index | Used by |
|---|---|---|
| `applicants.email` | `applicants_email_idx` (unique) | portal, export, erasure, signup |
| `newsletter_subscribers.email` | `newsletter_email_idx` (unique) | subscribe, export, erasure |
| `staff.email` | `staff_email_idx` (unique) | `requireStaff` |
| `leads.assigned_staff_id` | `leads_assigned_idx` | `scopeToStaff` |
| `leads.status` | `leads_status_idx` | admin dashboard count |
| `leads.created_at` | `leads_created_idx` | admin list ordering |
| `applications.stage` | `applications_stage_idx` | retention purge |
| `applications.applicant_id` | `applications_applicant_idx` | portal |
| `applications.reference` | `applications_reference_idx` (unique) | counselor lookup |
| `application_events.application_id` | `application_events_app_idx` | portal timeline |
| `consent_records (subject_email, purpose_key, created_at)` | `consent_records_subject_idx` | `getConsentState` |
| `parental_consent_requests.token_hash` | `parental_consent_token_idx` (unique) | guardian link |
| `parental_consent_requests.subject_email` | `parental_consent_subject_idx` | gate |
| `access_logs (actor_id, created_at)`, `(subject_email)`, `(created_at)` | 3 indexes | audit surface |
| `*_requests.subject_email`, `grievances.*`, `nominations.subject_email` | per-table | rights lookups |
| content tables (`slug`, `sort_order`, `course_hub_id`) | per-table | public pages |

## Added — migration `0004_perf_indexes.sql`

| Index | Column(s) | Why it was missing / why it matters |
|---|---|---|
| `leads_email_idx` | `leads.email` | **The gap that mattered most.** Every export and erasure looks a person up by address across `leads`, `newsletter_subscribers` and `applicants` (`lib/rights/collect.ts`). The other two have unique indexes; `leads` had none, so the s.11/s.12 fan-out sequential-scanned the table that grows fastest. Not unique — one person may send several enquiries. |
| `applications_assigned_idx` | `applications.assigned_staff_id` | `scopeToStaff` filters **every** admin application read by this. `leads` got the matching index when assignment was added; this one was missed — same filter, larger table. |
| `applications_updated_idx` | `applications.updated_at` | `ORDER BY updated_at DESC` on the admin list and the portal. |
| `leads_updated_idx` | `leads.updated_at` | Retention purge scans by last contact. |
| `newsletter_unsubscribe_token_idx` | `newsletter_subscribers.unsubscribe_token` | Every unsubscribe click resolves a row by token on an unauthenticated endpoint. Unique: Postgres permits unlimited NULLs, so pre-existing rows are unaffected and collisions become impossible. |
| `consent_records_created_idx` | `consent_records.created_at` | The existing composite leads with `subject_email`, so it cannot serve the admin ledger's "newest N across everyone" — that sorted the whole table. |
| `grievances_created_idx` | `grievances.created_at` | `/admin/privacy` ordering. |
| `data_export_requests_created_idx` | `data_export_requests.created_at` | `/admin/privacy` ordering. |
| `deletion_requests_created_idx` | `deletion_requests.created_at` | `/admin/privacy` ordering. |
| `correction_requests_status_created_idx` | `(status, created_at)` | The admin queue filters on status **and** orders by age in one query; the single-column status index cannot serve both. |
| `parental_consent_created_idx` | `parental_consent_requests.created_at` | Retention purge sweeps abandoned requests by age. |

## Flagged, deliberately not changed

- **`correction_requests_status_idx` is now redundant.** The new
  `(status, created_at)` composite has `status` as its leading column and
  answers everything the older single-column index does. It is left in place:
  the brief was not to touch existing indexes without flagging, and dropping
  one belongs in its own change. Dropping it costs nothing and saves a little
  write amplification — worth doing next time this file is opened.
- **`applicants_auth_user_idx`** indexes `auth_user_id`, which no query in
  `src/` currently filters on — the auth callback links by email instead. Not
  dropped: it is cheap, and a lookup by auth user is the obvious next thing
  someone writes.
- **No speculative composites** on `(assigned_staff_id, created_at)`. The
  scoped reads use `OR (assigned = $1, assigned IS NULL)` for the intake pool,
  which Postgres serves with a BitmapOr over the two single-column indexes; a
  composite would not help that shape.

## Not an index problem

`deleteAuthUserByEmail` (`src/lib/supabase/admin.ts`) pages the Supabase Admin
API 200 users at a time to find one by address — O(users/200) HTTP calls per
erasure. At 10k users that is 50 round trips. Supabase's admin API exposes no
get-by-email, so the fix is to query `auth.users` by SQL instead. Left alone
here: it sits in the erasure path, and changing that deserves its own change
with its own test. **Revisit before the user table reaches a few thousand.**
