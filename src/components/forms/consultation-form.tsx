"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { submitConsultation, type FormState } from "@/lib/actions/consultation";
import { upcomingIntakes, CONTACT_EMAIL } from "@/config/site";
import { CtaButton } from "@/components/ui/cta";
import { ConsentFields } from "@/components/consent/consent-fields";
import { DateOfBirthField } from "@/components/consent/dob-field";
import { ParentalConsentStep } from "@/components/consent/parental-consent-step";
import { cn } from "@/lib/utils";

const INTAKE_OPTIONS = upcomingIntakes();

const initial: FormState = { ok: false };

export type CourseOption = { slug: string; name: string };

function Field({
  label,
  name,
  type = "text",
  required,
  errors,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  errors?: string[];
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `field-${name}`;
  const errId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-body font-medium text-ink">
        {label} {required && <span className="text-sky-text">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errId : undefined}
        className={cn(
          "w-full rounded-lg border bg-white px-3.5 py-2.5 text-[16px] sm:text-[14.5px] text-ink placeholder:text-ink-soft/70",
          errors ? "border-destructive" : "border-line",
        )}
        {...rest}
      />
      {errors && (
        <p id={errId} className="mt-1.5 text-meta text-destructive">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <CtaButton type="submit" disabled={pending} variant="accent" block>
      {pending ? "Booking…" : "Book free consultation"}
      {!pending && <ArrowRight size={15} aria-hidden="true" />}
    </CtaButton>
  );
}

export function ConsultationForm({ courses }: { courses: CourseOption[] }) {
  const [state, formAction] = useActionState(submitConsultation, initial);
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.ok && state.next?.step === "parental_consent" ? (
        <motion.div
          key="parental"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <ParentalConsentStep
            subjectEmail={state.next.subjectEmail}
            subjectName={state.next.subjectName}
          />
        </motion.div>
      ) : state.ok ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-2xl border border-brandgreen/30 bg-brandgreen-dim p-8 text-center"
        >
          <CheckCircle2
            size={32}
            className="mx-auto mb-4 text-brandgreen"
            aria-hidden="true"
          />
          <h2 className="mb-2 text-[22px] font-semibold text-ink">Consultation booked</h2>
          <p role="status" className="mx-auto max-w-[42ch] text-[14.5px] text-ink-soft">
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
          <input type="hidden" name="sourcePath" value={pathname} />
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              name="fullName"
              required
              autoComplete="name"
              placeholder="Priya Sharma"
              errors={state.fieldErrors?.fullName}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              errors={state.fieldErrors?.email}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              errors={state.fieldErrors?.phone}
            />
            <DateOfBirthField required errors={state.fieldErrors?.dateOfBirth} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="field-preferredIntake"
                className="mb-1.5 block text-body font-medium text-ink"
              >
                Preferred intake
              </label>
              <select
                id="field-preferredIntake"
                name="preferredIntake"
                defaultValue=""
                className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[16px] sm:text-[14.5px] text-ink"
              >
                <option value="">No preference</option>
                {INTAKE_OPTIONS.map((intake) => (
                  <option key={intake} value={intake}>
                    {intake}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="field-courseHubSlug"
                className="mb-1.5 block text-body font-medium text-ink"
              >
                Course of interest
              </label>
              <select
                id="field-courseHubSlug"
                name="courseHubSlug"
                defaultValue=""
                className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[16px] sm:text-[14.5px] text-ink"
              >
                <option value="">Not sure yet — help me choose</option>
                {courses.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="field-message"
              className="mb-1.5 block text-body font-medium text-ink"
            >
              Anything else we should know?
            </label>
            <textarea
              id="field-message"
              name="message"
              rows={4}
              placeholder="Your academic background, target universities, or questions."
              className="w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-[16px] sm:text-[14.5px] text-ink placeholder:text-ink-soft/70"
            />
          </div>

          <ConsentFields form="consultation" fieldErrors={state.fieldErrors} />

          <AnimatePresence initial={false}>
            {state.message && !state.ok && (
              <motion.p
                key="consultation-error"
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
            Free, no obligation. We reply within one working day.
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}
