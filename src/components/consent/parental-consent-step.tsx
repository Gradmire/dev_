"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MailCheck, ShieldCheck, ArrowRight } from "lucide-react";
import { requestParentalConsent } from "@/lib/actions/parental";
import { CtaButton } from "@/components/ui/cta";
import { CONTACT_EMAIL } from "@/config/site";
import { cn } from "@/lib/utils";
import type { FormState } from "@/lib/actions/consultation";

const initial: FormState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <CtaButton type="submit" disabled={pending} variant="accent" block>
      {pending ? "Sending…" : "Send them the permission link"}
      {!pending && <ArrowRight size={15} aria-hidden="true" />}
    </CtaButton>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  errors,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  errors?: string[];
  autoComplete?: string;
}) {
  const id = `parental-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-body font-medium text-ink">
        {label} <span className="text-sky-text">*</span>
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? `${id}-error` : undefined}
        className={cn(
          "w-full rounded-lg border bg-white px-3.5 py-2.5 text-[16px] text-ink placeholder:text-ink-soft/70 sm:text-[14.5px]",
          errors ? "border-destructive" : "border-line",
        )}
      />
      {errors && (
        <p id={`${id}-error`} className="mt-1.5 text-meta text-destructive">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

/**
 * Step two for an under-18 applicant: collect a guardian's address and email
 * them a one-time link (DPDP s.9, Rule 10).
 *
 * Rendered in place of the success panel rather than on a separate page, so
 * the enquiry they just submitted stays visibly connected to the step that
 * unblocks it.
 */
export function ParentalConsentStep({
  subjectEmail,
  subjectName,
  intro,
}: {
  subjectEmail: string;
  subjectName?: string;
  intro?: string;
}) {
  const [state, formAction] = useActionState(requestParentalConsent, initial);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.ok ? (
        <motion.div
          key="sent"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-2xl border border-brandgreen/30 bg-brandgreen-dim p-8 text-center"
        >
          <MailCheck size={30} className="mx-auto mb-3.5 text-brandgreen" aria-hidden="true" />
          <h2 className="mb-2 text-[20px] font-semibold text-ink">Permission link sent</h2>
          <p role="status" className="mx-auto max-w-[44ch] text-ui text-ink-soft">
            {state.message}
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-2xl border border-sky/40 bg-sky-dim p-6 sm:p-7"
        >
          <div className="mb-5 flex gap-3">
            <ShieldCheck size={22} className="mt-0.5 shrink-0 text-sky-text" aria-hidden="true" />
            <div>
              <span className="eyebrow">One more step</span>
              <h2 className="mt-2 text-[20px] font-semibold text-ink">
                We need a parent or guardian&rsquo;s permission
              </h2>
              <p className="mt-2 max-w-[52ch] text-ui text-ink-soft">
                {intro ??
                  "You told us you're under 18. Indian data protection law means we need a parent or guardian to confirm before a counselor can help you — so we'll email them a link. Your enquiry is safe with us until then; we just won't act on it."}
              </p>
            </div>
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="subjectEmail" value={subjectEmail} />

            <Field
              label="Their full name"
              name="parentName"
              placeholder="Anita Sharma"
              errors={state.fieldErrors?.parentName}
            />
            <Field
              label="Their email address"
              name="parentEmail"
              type="email"
              placeholder="parent@email.com"
              autoComplete="off"
              errors={state.fieldErrors?.parentEmail}
            />
            <Field
              label="How are they related to you?"
              name="relationship"
              placeholder="Mother, father, legal guardian…"
              errors={state.fieldErrors?.relationship}
            />

            <AnimatePresence initial={false}>
              {state.message && !state.ok && (
                <motion.p
                  key="parental-error"
                  role="alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="text-body text-destructive"
                >
                  {state.message}
                  {state.code === "server_error" && (
                    <>
                      {" "}
                      <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                        {CONTACT_EMAIL}
                      </a>
                    </>
                  )}
                </motion.p>
              )}
            </AnimatePresence>

            <SubmitButton />

            <p className="text-center text-meta text-ink-soft">
              We only email them about this. {subjectName ? `${subjectName}'s` : "Your"}{" "}
              details aren&rsquo;t shared with anyone else.
            </p>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
