# Personal data breach runbook

DPDP Act, 2023, s.8(6) and the Rules. **The clock is 72 hours from becoming
aware, to both the Data Protection Board and every affected Data Principal.**

There is no severity threshold in the Act. Unlike GDPR, there is **no
"unlikely to result in risk" exemption** — if personal data was breached, it
gets reported. Do not spend the window arguing about materiality.

---

## 0. Before anything happens

| | |
|---|---|
| **Incident lead** | Grievance Officer (`NEXT_PUBLIC_GRIEVANCE_OFFICER_EMAIL`) |
| **Deputy** | Named engineer with Supabase dashboard access |
| **Alerts arrive at** | The Grievance Officer's inbox, from `src/lib/breach.ts` |
| **Audit trail** | `/admin/privacy` → Access trail (admin only) |

> **Known gap.** Alerts are email-only. Email is not a pager, and the 72-hour
> clock does not pause overnight or at a weekend. Until a paging channel is
> added, a Friday-evening incident is a Monday-morning discovery with 60 of
> the 72 hours already spent.

---

## 1. Detect

**Automated signals** (`src/lib/breach.ts` → Grievance Officer):

| Signal | Fires when |
|---|---|
| `mass_read` | One staff read returns > 250 personal-data rows (`MASS_READ_THRESHOLD`) |
| `erasure_incomplete` | An erasure threw part-way, or the Supabase auth record survived |
| `auth_deletion_failed` | The processor's copy of an identity could not be removed |
| `unauthorized_access_attempt` | Reserved — not yet wired |

**Non-automated sources — most real breaches arrive this way:**

- A counselor reports a misdirected email (a document sent to the wrong applicant).
- A lost or stolen laptop or phone with mail access.
- Supabase or Vercel notify us of an incident on their side.
- A data principal tells us they can see somebody else's data.
- A researcher or attacker makes contact.

**"Becoming aware" starts the clock** at the first credible report, not at the
end of the investigation that confirms it.

---

## 2. Contain — first hour

1. **Write down the time you became aware, in UTC.** Everything else is
   measured from this. Put it in the incident note before you do anything else.
2. **Revoke the path in.**
   - Suspected staff account: remove their row from `staff`, and delete their
     Supabase auth user. Removing the `staff` row alone is enough for `/admin`
     (`requireStaff` re-checks the table) but leaves them a portal session.
   - Leaked `SUPABASE_SERVICE_ROLE_KEY` or `DATABASE_URL`: rotate in the
     Supabase dashboard **first**, redeploy second. This bypasses RLS entirely.
   - Leaked `CRON_SECRET`: rotate. It authorises deletion.
3. **Do not delete evidence.** Not the access logs, not the mailbox, not the
   Vercel logs. `access_logs` is purged at 18 months by
   `src/lib/retention.ts` — if the incident is older than that, say so in the
   report rather than pretending to a certainty you do not have.
4. **Preserve the audit window.** Export the relevant `access_logs` rows
   before anything expires them.

---

## 3. Assess — first 24 hours

Answer these in writing. They are what both notifications are built from.

- **What categories of data?** Name, email, phone, date of birth, academic
  background, counselor notes — and whether any **passport, financial or
  transcript documents** were involved (those live outside the app; see RoPA §8).
- **How many data principals?** Query by the affected table. Do not estimate.
- **Any children?** Cross-reference `applicants.dateOfBirth` and
  `parental_consent_requests`. A breach involving a minor's data is materially
  more serious and must be called out explicitly in both notifications.
- **When did it start and stop?**
- **Is it still happening?**
- **What caused it?**

---

## 4. Notify the Board — within 72 hours

Submit through the Data Protection Board's portal. Include:

1. Nature, extent, timing and location of the breach.
2. Likely consequences for the affected Data Principals.
3. Mitigation already carried out.
4. Remedial measures to prevent recurrence.
5. Findings on who caused it, if known.
6. Notifications sent to Data Principals, and when.

**If you do not yet have all of this, file anyway inside 72 hours and follow
up.** A late complete report is a breach of s.8(6); an early incomplete one is
not.

---

## 5. Notify affected Data Principals — within 72 hours

Every affected person, individually — **not a banner on the site.** In plain
language, without minimising:

- What happened and when.
- Exactly what data of theirs was involved.
- What we have done about it.
- What they should do — and be specific. If passport data was involved, say
  so and point them at re-issuance; a generic "monitor your accounts" is not
  adequate for a document that can be used to impersonate them.
- The Grievance Officer's contact details and their right to escalate to the
  Board.

For a minor, notify the **parent or guardian** on the verified
`parental_consent_requests` row where one exists.

Draft addresses are reachable: `leads.email`, `applicants.email`,
`newsletter_subscribers.email`. Someone whose data has been **erased** cannot
be notified — record that in the Board report rather than leaving the count
unexplained.

---

## 6. After

- [ ] Root cause written up, no blame, with the specific code or process change.
- [ ] Record kept **permanently** — the Board can ask later.
- [ ] Update this runbook with whatever it got wrong.
- [ ] If the cause was a missing control, add the control **and a test**.
- [ ] Review whether the retention periods in `src/lib/retention.ts` would have
      reduced the blast radius. Data already deleted cannot be breached — this
      is the single most effective control available.

---

## Quick reference

```
Clock starts            on becoming aware (not on confirming)
Board notification      72 hours
Data Principals         72 hours, individually
Severity threshold      none — all breaches are reportable
Max penalty             ₹250 crore (failure to safeguard / notify)
Alerts                  src/lib/breach.ts → Grievance Officer's inbox
Audit trail             /admin/privacy → Access trail
Retention purge         src/lib/retention.ts, nightly 03:00 UTC
```
