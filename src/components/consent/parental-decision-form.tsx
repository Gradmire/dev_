"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { submitParentalDecision } from "@/lib/actions/parental";
import type { FormState } from "@/lib/actions/consultation";
import { cn } from "@/lib/utils";

const initial: FormState = { ok: false };

function DecisionButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        type="submit"
        name="decision"
        value="grant"
        disabled={pending}
        className="flex-1 rounded-pill bg-ink px-6 py-3.5 text-lede font-semibold text-paper transition-colors hover:bg-navy disabled:opacity-70"
      >
        {pending ? "Saving…" : "Yes, I give permission"}
      </button>
      <button
        type="submit"
        name="decision"
        value="decline"
        disabled={pending}
        className="flex-1 rounded-pill border-[1.5px] border-ink px-6 py-3.5 text-lede font-semibold text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-70"
      >
        No, I decline
      </button>
    </div>
  );
}

/**
 * The guardian's decision (DPDP s.9, Rule 10).
 *
 * The declaration tick is what makes this *verifiable* parental consent
 * rather than a click from whoever opened the email — it is an affirmative
 * statement that they are the child's guardian and an adult. Both buttons
 * submit the same form so that declining is exactly as easy as agreeing;
 * making refusal the harder path would undermine the point of asking.
 */
export function ParentalDecisionForm({
  token,
  childName,
}: {
  token: string;
  childName: string;
}) {
  const [state, formAction] = useActionState(submitParentalDecision, initial);

  if (state.ok) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-2xl border border-brandgreen/30 bg-brandgreen-dim p-8 text-center"
      >
        <CheckCircle2 size={32} className="mx-auto mb-4 text-brandgreen" aria-hidden="true" />
        <h2 className="mb-2 text-[20px] font-semibold text-ink">Recorded</h2>
        <p role="status" className="mx-auto max-w-[44ch] text-ui text-ink-soft">
          {state.message}
        </p>
      </motion.div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="token" value={token} />

      <div
        className={cn(
          "rounded-lg border p-4",
          state.fieldErrors?.declaration ? "border-destructive" : "border-line",
        )}
      >
        <div className="flex gap-3">
          <input
            id="parental-declaration"
            name="declaration"
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-sky-text"
          />
          <label
            htmlFor="parental-declaration"
            className="cursor-pointer text-body text-ink"
          >
            I confirm I am {childName}&rsquo;s parent or legal guardian, that I am
            over 18, and that I have read what Gradmire will hold and do with their
            information.
          </label>
        </div>
        {state.fieldErrors?.declaration && (
          <p className="mt-2 text-meta text-destructive">
            {state.fieldErrors.declaration[0]}
          </p>
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
          </motion.p>
        )}
      </AnimatePresence>

      <DecisionButtons />

      <p className="text-center text-meta text-ink-soft">
        Declining stops us processing their enquiry. You can change your mind by
        asking them to send a new request.
      </p>
    </form>
  );
}
