"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { FormState } from "@/lib/actions/consultation";
import { CtaButton } from "@/components/ui/cta";
import { cn } from "@/lib/utils";

const initial: FormState = { ok: false };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <CtaButton type="submit" disabled={pending} size="sm">
      {pending ? "Saving…" : label}
    </CtaButton>
  );
}

/**
 * `ui/label.tsx` is the shadcn primitive and styles itself off `text-sm`,
 * which is a size the brand scale does not use. Admin forms want `text-meta`.
 */
export function FieldLabel({
  htmlFor,
  className,
  children,
}: {
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("mb-1 block text-meta font-medium", className)}
    >
      {children}
    </label>
  );
}

/**
 * Thin wrapper so admin forms share submit state and result messaging
 * without each page re-implementing useActionState.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Submit label={submitLabel} />
        <AnimatePresence initial={false}>
          {state.message && (
            <motion.span
              key="action-status"
              role="status"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "text-meta",
                state.ok ? "text-brandgreen" : "text-destructive",
              )}
            >
              {state.message}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence initial={false}>
        {state.fieldErrors && (
          <motion.ul
            key="action-field-errors"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-1.5 space-y-0.5 text-meta text-destructive"
          >
            {Object.entries(state.fieldErrors).map(([field, errors]) => (
              <li key={field}>
                {field}: {errors[0]}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </form>
  );
}
