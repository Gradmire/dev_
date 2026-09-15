"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MailCheck } from "lucide-react";
import { signUp } from "@/lib/actions/auth";
import { CtaButton } from "@/components/ui/cta";
import { ConsentFields } from "@/components/consent/consent-fields";
import { DateOfBirthField } from "@/components/consent/dob-field";
import { ParentalConsentStep } from "@/components/consent/parental-consent-step";
import type { FormState } from "@/lib/actions/consultation";

const initial: FormState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <CtaButton type="submit" disabled={pending} block>
      {pending ? "Creating account…" : "Create account"}
    </CtaButton>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, initial);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.ok && state.next?.step === "parental_consent" ? (
        <motion.div
          key="parental"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="space-y-5"
        >
          <div className="rounded-2xl border border-brandgreen/30 bg-brandgreen-dim p-5 text-center">
            <MailCheck size={24} className="mx-auto mb-2 text-brandgreen" aria-hidden="true" />
            <p role="status" className="text-ui text-ink-soft">
              Your sign-in link is on its way to your inbox.
            </p>
          </div>
          <ParentalConsentStep
            subjectEmail={state.next.subjectEmail}
            subjectName={state.next.subjectName}
            intro="You told us you're under 18. Before a counselor can start work on your applications, Indian data protection law needs a parent or guardian to confirm — we'll email them a link that takes one click."
          />
        </motion.div>
      ) : state.ok ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-2xl border border-brandgreen/30 bg-brandgreen-dim p-7 text-center"
        >
          <MailCheck size={30} className="mx-auto mb-3.5 text-brandgreen" aria-hidden="true" />
          <h2 className="mb-2 text-[19px] font-semibold">Check your inbox</h2>
          <p role="status" className="text-ui text-ink-soft">
            {state.message}
          </p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          action={formAction}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="space-y-4"
        >
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          <div>
            <label htmlFor="signup-fullName" className="mb-1.5 block text-body font-medium">
              Full name
            </label>
            <input
              id="signup-fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              placeholder="Priya Sharma"
              aria-invalid={state.fieldErrors?.fullName ? true : undefined}
              aria-describedby={state.fieldErrors?.fullName ? "signup-fullName-error" : undefined}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[16px] sm:text-[14.5px]"
            />
            {state.fieldErrors?.fullName && (
              <p id="signup-fullName-error" className="mt-1.5 text-meta text-destructive">
                {state.fieldErrors.fullName[0]}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="signup-email" className="mb-1.5 block text-body font-medium">
              Email address
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              aria-invalid={state.fieldErrors?.email ? true : undefined}
              aria-describedby={state.fieldErrors?.email ? "signup-email-error" : undefined}
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[16px] sm:text-[14.5px]"
            />
            {state.fieldErrors?.email && (
              <p id="signup-email-error" className="mt-1.5 text-meta text-destructive">
                {state.fieldErrors.email[0]}
              </p>
            )}
          </div>

          <DateOfBirthField
            id="signup-dateOfBirth"
            required
            errors={state.fieldErrors?.dateOfBirth}
          />

          <ConsentFields form="signup" fieldErrors={state.fieldErrors} />

          <AnimatePresence initial={false}>
            {!state.ok && state.message && (
              <motion.p
                key="signup-error"
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="text-body text-destructive"
              >
                {state.message}
              </motion.p>
            )}
          </AnimatePresence>

          <SubmitButton />
        </motion.form>
      )}
    </AnimatePresence>
  );
}
