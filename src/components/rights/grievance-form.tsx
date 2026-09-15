"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { submitGrievance } from "@/lib/actions/rights";
import { GRIEVANCE_CATEGORIES } from "@/lib/validation";
import { CtaButton } from "@/components/ui/cta";
import { CONTACT_EMAIL } from "@/config/site";
import type { FormState } from "@/lib/actions/consultation";
import { cn } from "@/lib/utils";

const initial: FormState = { ok: false };

const inputCls =
  "w-full rounded-lg border bg-white px-3.5 py-2.5 text-[16px] text-ink placeholder:text-ink-soft/70 sm:text-[14.5px]";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <CtaButton type="submit" disabled={pending} block>
      {pending ? "Submitting…" : "Submit grievance"}
    </CtaButton>
  );
}

export function GrievanceForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction] = useActionState(submitGrievance, initial);

  if (state.ok) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-2xl border border-brandgreen/30 bg-brandgreen-dim p-8 text-center"
      >
        <CheckCircle2 size={32} className="mx-auto mb-4 text-brandgreen" aria-hidden="true" />
        <h2 className="mb-2 text-[20px] font-semibold text-ink">Grievance logged</h2>
        <p role="status" className="mx-auto max-w-[46ch] text-ui text-ink-soft">
          {state.message}
        </p>
      </motion.div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="grievance-fullName" className="mb-1.5 block text-body font-medium">
            Your name <span className="text-sky-text">*</span>
          </label>
          <input
            id="grievance-fullName"
            name="fullName"
            required
            placeholder="Priya Sharma"
            className={cn(inputCls, state.fieldErrors?.fullName ? "border-destructive" : "border-line")}
          />
          {state.fieldErrors?.fullName && (
            <p className="mt-1.5 text-meta text-destructive">{state.fieldErrors.fullName[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="grievance-email" className="mb-1.5 block text-body font-medium">
            Your email <span className="text-sky-text">*</span>
          </label>
          <input
            id="grievance-email"
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            placeholder="you@email.com"
            className={cn(inputCls, state.fieldErrors?.email ? "border-destructive" : "border-line")}
          />
          {state.fieldErrors?.email && (
            <p className="mt-1.5 text-meta text-destructive">{state.fieldErrors.email[0]}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="grievance-category" className="mb-1.5 block text-body font-medium">
          What is this about? <span className="text-sky-text">*</span>
        </label>
        <select
          id="grievance-category"
          name="category"
          required
          defaultValue=""
          className={cn(inputCls, state.fieldErrors?.category ? "border-destructive" : "border-line")}
        >
          <option value="" disabled>
            Choose one
          </option>
          {GRIEVANCE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {state.fieldErrors?.category && (
          <p className="mt-1.5 text-meta text-destructive">{state.fieldErrors.category[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="grievance-details" className="mb-1.5 block text-body font-medium">
          What happened? <span className="text-sky-text">*</span>
        </label>
        <textarea
          id="grievance-details"
          name="details"
          rows={6}
          required
          placeholder="Tell us what went wrong, when, and what you'd like us to do about it."
          className={cn(inputCls, state.fieldErrors?.details ? "border-destructive" : "border-line")}
        />
        {state.fieldErrors?.details && (
          <p className="mt-1.5 text-meta text-destructive">{state.fieldErrors.details[0]}</p>
        )}
      </div>

      <AnimatePresence initial={false}>
        {state.message && !state.ok && (
          <motion.p
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

      <Submit />
    </form>
  );
}
