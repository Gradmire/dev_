"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Download, FileJson, FileSpreadsheet } from "lucide-react";
import {
  updateProfile,
  submitCorrectionRequest,
  saveNomination,
  removeNomination,
  deleteMyAccount,
} from "@/lib/actions/rights";
import { CtaButton } from "@/components/ui/cta";
import { CONTACT_EMAIL, RIGHTS_SLA } from "@/config/site";
import type { FormState } from "@/lib/actions/consultation";
import { cn } from "@/lib/utils";

const initial: FormState = { ok: false };

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Status({ state }: { state: FormState }) {
  return (
    <AnimatePresence initial={false}>
      {state.message && (
        <motion.p
          role={state.ok ? "status" : "alert"}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={cn(
            "flex items-start gap-1.5 text-body",
            state.ok ? "text-brandgreen" : "text-destructive",
          )}
        >
          {state.ok && <Check size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
          <span>
            {state.message}
            {state.code === "server_error" && (
              <>
                {" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                  {CONTACT_EMAIL}
                </a>
              </>
            )}
          </span>
        </motion.p>
      )}
    </AnimatePresence>
  );
}

function Submit({
  idle,
  busy,
  variant = "primary",
}: {
  idle: string;
  busy: string;
  variant?: "primary" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <CtaButton type="submit" disabled={pending} size="md" variant={variant}>
      {pending ? busy : idle}
    </CtaButton>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[16px] text-ink placeholder:text-ink-soft/70 sm:text-[14.5px]";

function Labelled({
  label,
  htmlFor,
  hint,
  errors,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  errors?: string[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-body font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !errors && <p className="mt-1.5 text-meta text-ink-soft">{hint}</p>}
      {errors && <p className="mt-1.5 text-meta text-destructive">{errors[0]}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* s.11 — export                                                       */
/* ------------------------------------------------------------------ */

/**
 * Plain links, not fetch-and-blob. The browser streams the file straight from
 * the route handler, so a complete copy of somebody's personal record never
 * sits in a JavaScript variable waiting to be read by anything else on the page.
 */
export function ExportPanel() {
  return (
    <div className="flex flex-wrap gap-3">
      <a
        href="/api/account/export?format=json"
        download
        className="inline-flex items-center gap-2 rounded-pill bg-ink px-5 py-2.5 text-ui font-semibold text-paper transition-colors hover:bg-navy"
      >
        <FileJson size={15} aria-hidden="true" />
        Download JSON
      </a>
      <a
        href="/api/account/export?format=csv"
        download
        className="inline-flex items-center gap-2 rounded-pill border-[1.5px] border-ink px-5 py-2.5 text-ui font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        <FileSpreadsheet size={15} aria-hidden="true" />
        Download CSV
      </a>
      <p className="flex w-full items-center gap-1.5 text-meta text-ink-soft">
        <Download size={12} aria-hidden="true" />
        Downloads immediately — no waiting, no request to approve.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* s.12(1) — correction                                                */
/* ------------------------------------------------------------------ */

export function ProfileForm({
  fullName,
  phone,
  dateOfBirth,
}: {
  fullName: string;
  phone: string;
  dateOfBirth: string;
}) {
  const [state, formAction] = useActionState(updateProfile, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="Full name" htmlFor="rights-fullName" errors={state.fieldErrors?.fullName}>
          <input
            id="rights-fullName"
            name="fullName"
            defaultValue={fullName}
            required
            className={inputCls}
          />
        </Labelled>
        <Labelled label="Phone" htmlFor="rights-phone" errors={state.fieldErrors?.phone}>
          <input
            id="rights-phone"
            name="phone"
            type="tel"
            defaultValue={phone}
            placeholder="+91 98765 43210"
            className={inputCls}
          />
        </Labelled>
      </div>

      <Labelled
        label="Date of birth"
        htmlFor="rights-dateOfBirth"
        hint="Used only to work out whether the under-18 protections apply to you."
        errors={state.fieldErrors?.dateOfBirth}
      >
        <input
          id="rights-dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={dateOfBirth}
          className={inputCls}
        />
      </Labelled>

      <Status state={state} />
      <Submit idle="Save changes" busy="Saving…" />
    </form>
  );
}

export function CorrectionRequestForm() {
  const [state, formAction] = useActionState(submitCorrectionRequest, initial);

  return (
    <form action={formAction} className="space-y-4">
      <Labelled
        label="What needs correcting?"
        htmlFor="rights-details"
        hint={`Tell us which record is wrong and what it should say. We'll action it within ${RIGHTS_SLA.correctionDays} days.`}
        errors={state.fieldErrors?.details}
      >
        <textarea
          id="rights-details"
          name="details"
          rows={4}
          required
          placeholder="My application lists the wrong university — it should be…"
          className={inputCls}
        />
      </Labelled>
      <Status state={state} />
      <Submit idle="Send correction request" busy="Sending…" variant="outline" />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* s.14 — nomination                                                   */
/* ------------------------------------------------------------------ */

export function NominationForm({
  nomineeName,
  nomineeEmail,
  nomineeRelationship,
  hasNomination,
}: {
  nomineeName: string;
  nomineeEmail: string;
  nomineeRelationship: string;
  hasNomination: boolean;
}) {
  const [state, formAction] = useActionState(saveNomination, initial);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Labelled
            label="Their full name"
            htmlFor="rights-nomineeName"
            errors={state.fieldErrors?.nomineeName}
          >
            <input
              id="rights-nomineeName"
              name="nomineeName"
              defaultValue={nomineeName}
              required
              placeholder="Anita Sharma"
              className={inputCls}
            />
          </Labelled>
          <Labelled
            label="Their email"
            htmlFor="rights-nomineeEmail"
            errors={state.fieldErrors?.nomineeEmail}
          >
            <input
              id="rights-nomineeEmail"
              name="nomineeEmail"
              type="email"
              defaultValue={nomineeEmail}
              required
              placeholder="them@email.com"
              className={inputCls}
            />
          </Labelled>
        </div>

        <Labelled
          label="Relationship (optional)"
          htmlFor="rights-nomineeRelationship"
          errors={state.fieldErrors?.nomineeRelationship}
        >
          <input
            id="rights-nomineeRelationship"
            name="nomineeRelationship"
            defaultValue={nomineeRelationship}
            placeholder="Mother, spouse, sibling…"
            className={inputCls}
          />
        </Labelled>

        <Status state={state} />
        <Submit idle={hasNomination ? "Update nominee" : "Nominate them"} busy="Saving…" />
      </form>

      {hasNomination && (
        <form action={removeNomination}>
          <button
            type="submit"
            className="text-meta text-ink-soft underline hover:text-destructive"
          >
            Remove this nomination
          </button>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* s.12(3) — erasure                                                   */
/* ------------------------------------------------------------------ */

/**
 * Deliberately unglamorous, and deliberately honest about what survives.
 *
 * A deletion screen that implies everything vanishes, when an anonymised
 * enrolment record is kept for the statutory financial period, is a worse
 * failure than the retention itself — so the carve-outs are listed here in
 * full, before the button, rather than in the policy.
 */
export function DeleteAccountForm() {
  const [state, formAction] = useActionState(deleteMyAccount, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-lg border border-destructive/25 bg-destructive/[0.04] p-4">
        <p className="mb-2 flex items-center gap-1.5 text-body font-semibold text-ink">
          <AlertTriangle size={14} className="text-destructive" aria-hidden="true" />
          This is permanent and immediate.
        </p>
        <p className="mb-3 text-meta text-ink-soft">
          We delete your account, your enquiries, your newsletter subscription and
          any application that hasn&rsquo;t reached enrolment. Your sign-in is
          removed too, so this link stops working.
        </p>
        <p className="mb-1.5 font-mono text-micro uppercase tracking-[0.1em] text-ink-soft">
          What we have to keep
        </p>
        <ul className="list-disc space-y-1 pl-5 text-meta text-ink-soft">
          <li>
            If you enrolled at a university through us, an anonymised record of
            that enrolment — a reference, the university and the date, with your
            name and contact details stripped out. We&rsquo;re paid a commission
            on it, so it&rsquo;s a financial record we have to hold for 8 years.
          </li>
          <li>
            A coded record that you gave and withdrew consent, and that this
            deletion happened. Your email address is replaced by a one-way code,
            so it can&rsquo;t be traced back to you. Kept 5 years.
          </li>
        </ul>
      </div>

      <Labelled
        label="Why are you leaving? (optional)"
        htmlFor="rights-reason"
        hint="Helps us improve. Skip it if you'd rather not say."
      >
        <textarea id="rights-reason" name="reason" rows={2} className={inputCls} />
      </Labelled>

      <Labelled
        label="Type DELETE to confirm"
        htmlFor="rights-confirmation"
        errors={state.fieldErrors?.confirmation}
      >
        <input
          id="rights-confirmation"
          name="confirmation"
          required
          autoComplete="off"
          placeholder="DELETE"
          className={inputCls}
        />
      </Labelled>

      <Status state={state} />

      <CtaButton
        type="submit"
        size="md"
        className="bg-destructive text-white hover:bg-destructive/90"
      >
        Delete my account and erase my data
      </CtaButton>
    </form>
  );
}
