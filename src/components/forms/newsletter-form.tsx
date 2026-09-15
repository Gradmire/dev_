"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { subscribeToNewsletter, type FormState } from "@/lib/actions/consultation";
import { CONSENT_PURPOSES } from "@/lib/consent/purposes";
import { cn } from "@/lib/utils";

const initial: FormState = { ok: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-11 shrink-0 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-sky-text text-white transition-colors hover:bg-navy disabled:opacity-60"
      aria-label="Subscribe"
    >
      <ArrowRight size={15} aria-hidden="true" />
    </button>
  );
}

export function NewsletterForm({ className }: { className?: string }) {
  const [state, formAction] = useActionState(subscribeToNewsletter, initial);
  const emailErrors = state.fieldErrors?.email;

  return (
    <div className={className}>
      <form action={formAction} className="flex items-center gap-2">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address for deadline reminders
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          placeholder="you@email.com"
          aria-invalid={emailErrors ? true : undefined}
          aria-describedby={emailErrors ? "newsletter-email-error" : undefined}
          className={cn(
            "min-w-0 flex-1 rounded-pill border bg-white/5 px-4 py-2 text-[16px] text-white sm:text-body placeholder:text-white/40",
            emailErrors ? "border-warning-on-dark" : "border-white/40",
          )}
        />
        {/* Honeypot — hidden from people, tempting to bots. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <SubmitButton />
      </form>

      {/*
        The notice that makes this consent informed rather than assumed.
        A bare email box with a submit arrow tells someone nothing about what
        they are agreeing to, and s.6(1) wants the purpose and the retention
        in front of them at the point of the decision — not one click away in
        a policy they will not open.
      */}
      <p className="mt-2 text-micro leading-relaxed text-white/60">
        {CONSENT_PURPOSES.marketing_email.description.split(".")[0]}. Unsubscribe
        from any email in one click.{" "}
        <Link href="/privacy" className="underline hover:text-white">
          How we handle your data
        </Link>
        .
      </p>

      <AnimatePresence initial={false}>
        {emailErrors ? (
          <motion.p
            key="newsletter-error"
            id="newsletter-email-error"
            role="alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-2 text-meta text-warning-on-dark"
          >
            {emailErrors[0]}
          </motion.p>
        ) : (
          state.message && (
            <motion.p
              key="newsletter-status"
              role="status"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "mt-2 text-meta",
                state.ok ? "text-success-on-dark" : "text-warning-on-dark",
              )}
            >
              {state.message}
            </motion.p>
          )
        )}
      </AnimatePresence>
    </div>
  );
}
