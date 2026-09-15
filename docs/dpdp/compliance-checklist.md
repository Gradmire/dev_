# DPDP Act, 2023 — compliance checklist

Each obligation mapped to the file or feature that satisfies it, so this can
be audited without reading the whole codebase.

**Status key:** ✅ implemented · ⚠️ partial, gap named · ❌ not done · 📋 process, not code

Substantive obligations commence **13 May 2027**. The Data Protection Board is
already operational.

---

## s.5 — Notice

| Obligation | Where | Status |
|---|---|---|
| Itemised notice before collection | `src/lib/consent/purposes.ts` — the registry *is* the notice, version-controlled | ✅ |
| Notice shown at the point of collection | `src/components/consent/consent-fields.tsx`, expandable per purpose | ✅ |
| Plain-language statement of data, purpose, retention | `CONSENT_PURPOSES[*].dataCategories` / `.description` / `.retention` | ✅ |
| Link to withdraw and to complain | Consent block + `/privacy` + footer | ✅ |
| Available in English + 8th Schedule languages on request | — | ❌ **Open.** Process task; no translation pipeline exists. |
| Notice to people whose data a counselor enters for them | `createApplication` creates a record with no notice issued | ⚠️ **Gap, RoPA §2.** |

## s.6 — Consent

| Obligation | Where | Status |
|---|---|---|
| Free, specific, informed, unconditional, unambiguous | Per-purpose checkboxes, **none pre-ticked** | ✅ |
| Clear affirmative action | Native checkboxes, `required` only on essential purposes, re-checked server-side | ✅ |
| Itemised, not bundled | `FORM_PURPOSES`, one checkbox per purpose | ✅ |
| Limited to data necessary for the stated purpose | `dataCategories` per purpose; server-side rejection of missing essentials | ✅ |
| Withdrawal as easy as giving | `/account/consent` (one click), `/unsubscribe?token=` (no sign-in) | ✅ |
| Withdrawal does not affect other purposes | `setConsent` — one purpose per submission, by design | ✅ |
| Consequences of withdrawal explained | Consent centre; required purposes route to deletion | ✅ |
| Proof of consent retained | `consent_records` — **append-only**, with notice version, IP, user agent | ✅ |
| Old consent never inherits new wording | `noticeVersion` per row; stale decisions flagged in the UI | ✅ |

## s.8 — Data Fiduciary obligations

| Obligation | Where | Status |
|---|---|---|
| Accuracy and completeness | `updateProfile` propagates corrections to open leads | ✅ |
| **s.8(4)** Reasonable security safeguards | See breakdown below | ✅ |
| **s.8(5)** Detect and record access | `src/lib/audit.ts` → `access_logs`; surfaced at `/admin/privacy` | ✅ |
| **s.8(6)** Breach notification, 72h | `src/lib/breach.ts` + `docs/dpdp/breach-runbook.md` | ⚠️ Alerting is email-only; no pager. Named in the runbook. |
| **s.8(7)** Erase when purpose is served | `src/lib/retention.ts`, nightly cron `/api/cron/purge` | ✅ |
| Processor bound by contract (Rule 6) | — | ❌ **No DPAs executed.** RoPA lists the four named vendors. |

### s.8(4) security breakdown

| Control | Where | Status |
|---|---|---|
| TLS in transit (browser) | HSTS preload, `next.config.mjs` | ✅ |
| TLS in transit (database) | `src/db/index.ts` — pinned Supabase root CA, **certificate verified**. Was plaintext (`ssl: false` default). | ✅ |
| Encryption at rest | Supabase volume encryption | ✅ |
| Field-level encryption | — | ⚠️ None. Acceptable while no passport/financial data is in the DB. |
| Role-based access control | `scopeToStaff` / `mayActOn` (`src/lib/auth.ts`); counselors scoped to own caseload | ✅ |
| Write-side authorisation | Ownership re-checked in `updateLeadStatus`, `updateApplicationStage`, `claimLead` | ✅ |
| Admin-only cross-cutting surfaces | `requireAdmin` on `/admin/privacy`, `/admin/courses` | ✅ |
| Row-level security | `drizzle/rls.sql` — all tables, deny-by-default on the new ones | ⚠️ App connects as owner and **bypasses RLS**; it is defence-in-depth against a leaked anon key only. Documented in the file. |
| Token handling | `src/lib/tokens.ts` — 32-byte CSPRNG, SHA-256 at rest, TTL | ✅ |
| Rate limiting | `src/lib/rate-limit.ts` on all public forms | ⚠️ In-memory, per-instance. Fine for form spam; swap for Redis under distributed abuse. |
| Audit logging | `access_logs`, including reads of the audit surface itself | ✅ |
| Anomaly detection | `checkMassRead`, threshold 250 rows | ✅ |
| Secrets | `SUPABASE_SERVICE_ROLE_KEY` used only for auth deletion; `CRON_SECRET` compared in constant time | ✅ |

## s.9 — Children's data

| Obligation | Where | Status |
|---|---|---|
| Verifiable parental consent before processing | `src/lib/actions/parental.ts`, `/parental-consent/[token]` | ✅ |
| Age determination | `src/lib/consent/age.ts` — **missing DOB is `unknown`, never `adult`** | ✅ |
| Age collected at every entry point | DOB on consultation + signup forms | ✅ |
| Processing blocked until confirmed | `mayProgressBeyondEnquiry`, enforced in `updateApplicationStage` | ✅ |
| **s.9(3)** No behavioural advertising to children | No advertising or analytics anywhere on the site | ✅ |
| No tracking of children | Confirmed by audit — zero trackers | ✅ |
| Guardian can withdraw | Published in the policy and the guardian email | ✅ |
| Tests | `src/lib/consent/age.test.ts` — boundary cases at the 18th birthday | ✅ |

## ss.11–14 — Data Principal rights

| Right | Where | Status |
|---|---|---|
| **s.11** Access / summary of data | `/api/account/export` (JSON + CSV), immediate | ✅ |
| **s.11** Identities of processors it was shared with | Privacy policy §sharing | ✅ |
| Internal counselor notes | **Withheld from automatic export**, disclosed on request after admin review; the export says so explicitly | ✅ by design |
| **s.12(1)** Correction | `updateProfile` (direct) + `correction_requests` (queued, 15-day SLA) | ✅ |
| **s.12(2)** Completion / updating | Same | ✅ |
| **s.12(3)** Erasure | `erasePersonalData` — real deletion, cascades to Supabase auth | ✅ |
| Erasure retention carve-outs disclosed | Shown **before** the confirm button, not buried in the policy | ✅ |
| **s.13** Grievance redressal | `/grievance`, no login required; 30-day SLA stamped at insert | ✅ |
| **s.13(3)** Grievance Officer published | `GRIEVANCE_OFFICER` in config; policy, footer, account area | ✅ |
| **s.14** Nomination | `nominations` table, `/account/data` | ✅ |
| Rights reachable without hunting | Footer links on every page; account tabs | ✅ |

## s.16 — Cross-border transfer

| Obligation | Where | Status |
|---|---|---|
| Transfer permitted (no restricted country) | Singapore — not restricted | ✅ |
| Disclosed to the Data Principal | `DATA_LOCATIONS` → privacy policy §transfers | ✅ |

## s.10 — Significant Data Fiduciary

Not triggered at current volume. No DPIA, independent auditor or DPO
obligation. **Re-assess if volume grows materially.** — 📋

---

## Outstanding — ranked

| # | Item | Why it matters | Owner |
|---|---|---|---|
| 1 | **Off-system documents** (RoPA §8) — passports, transcripts, financials in email/WhatsApp | Highest-sensitivity data, entirely outside every control built here. Automated erasure cannot reach it. | Ops |
| 2 | **DPAs** with Supabase, Vercel, Resend | Rule 6 requires a contract before processing. None exist. | Legal |
| 3 | **Resend DPA before enabling** `RESEND_API_KEY` | Parental consent emails carry a child's name to a US processor | Legal |
| 4 | Notice for counselor-created records | Person gets no s.5 notice today | Product |
| 5 | Breach paging channel | Email is not a pager; 72h does not pause at a weekend | Eng |
| 6 | 8th Schedule language availability | s.5(3) | Ops |
| 7 | Newsletter double opt-in | Blocked on a mailer existing at all | Eng |
| 8 | Ban document exchange over consumer messaging, in writing | Supports #1 | Ops |

---

## Verifying this yourself

```bash
npm test                      # 83 tests, incl. age boundaries, RBAC and migrations
npm run build                 # type + lint gate
npx drizzle-kit generate      # should report no schema drift

# Retention, without deleting anything:
curl -H "Authorization: Bearer $CRON_SECRET" \
  "$SITE/api/cron/purge?dryRun=1"
```

Key files: `src/lib/consent/`, `src/lib/rights/collect.ts`, `src/lib/auth.ts`,
`src/lib/audit.ts`, `src/lib/retention.ts`, `src/lib/breach.ts`, `src/db/index.ts`.
