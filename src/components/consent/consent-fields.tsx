"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { CONSENT_PURPOSES, FORM_PURPOSES, type FormKey } from "@/lib/consent/purposes";
import { cn } from "@/lib/utils";

/**
 * The itemised consent block that sits above every submit button.
 *
 * Three things here are requirements rather than styling choices, and none of
 * them should be "tidied up" later:
 *
 *   - Nothing is pre-ticked. `defaultChecked` is absent on purpose; DPDP s.6
 *     wants a clear affirmative action, and a box that arrives ticked is the
 *     textbook example of what does not count.
 *   - Each purpose is its own checkbox. One "I agree to everything" control
 *     over unrelated purposes is bundled consent, which s.6(1) rules out.
 *   - Every purpose can be expanded to show exactly what is collected and how
 *     long it is kept, without leaving the page. Consent is only informed if
 *     the information is actually reachable at the moment of deciding.
 */

function PurposeRow({
  purposeKey,
  formKey,
  error,
}: {
  purposeKey: keyof typeof CONSENT_PURPOSES;
  formKey: FormKey;
  error?: string[];
}) {
  const purpose = CONSENT_PURPOSES[purposeKey];
  const [open, setOpen] = useState(false);
  const inputId = `consent-${formKey}-${purposeKey}`;
  const detailsId = `${inputId}-details`;

  return (
    <div
      className={cn(
        "rounded-lg border p-3.5 transition-colors",
        error ? "border-destructive bg-destructive/[0.03]" : "border-line bg-white",
      )}
    >
      <div className="flex gap-3">
        <input
          id={inputId}
          name={`consent.${purposeKey}`}
          type="checkbox"
          required={purpose.required}
          aria-describedby={detailsId}
          aria-invalid={error ? true : undefined}
          // accent-color keeps the native control (and its full keyboard and
          // screen-reader behaviour) while tinting it to the brand.
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line accent-sky-text"
        />
        <div className="min-w-0 flex-1">
          <label
            htmlFor={inputId}
            className="block cursor-pointer text-body font-medium text-ink"
          >
            {purpose.label}{" "}
            {purpose.required ? (
              <span className="text-sky-text" aria-hidden="true">
                *
              </span>
            ) : (
              <span className="font-normal text-ink-soft">(optional)</span>
            )}
          </label>
          <p id={detailsId} className="mt-1 text-meta leading-relaxed text-ink-soft">
            {purpose.description}
          </p>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-2 inline-flex items-center gap-1 text-meta font-medium text-sky-text hover:underline"
          >
            What exactly, and for how long?
            <ChevronDown
              size={13}
              aria-hidden="true"
              className={cn("transition-transform", open && "rotate-180")}
            />
          </button>

          {open && (
            <dl className="mt-2.5 space-y-2 rounded-lg bg-paper-dim p-3 text-meta">
              <div>
                <dt className="font-mono text-micro uppercase tracking-[0.1em] text-ink-soft">
                  What we collect
                </dt>
                <dd className="mt-1 text-ink-soft">
                  {purpose.dataCategories.join(" · ")}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-micro uppercase tracking-[0.1em] text-ink-soft">
                  How long we keep it
                </dt>
                <dd className="mt-1 text-ink-soft">{purpose.retention}</dd>
              </div>
            </dl>
          )}

          {error && <p className="mt-1.5 text-meta text-destructive">{error[0]}</p>}
        </div>
      </div>
    </div>
  );
}

export function ConsentFields({
  form,
  fieldErrors,
  className,
}: {
  form: FormKey;
  fieldErrors?: Record<string, string[]>;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-2.5", className)}>
      <legend className="mb-2 font-mono text-mini uppercase tracking-[0.1em] text-ink-soft">
        Your permission
      </legend>

      {FORM_PURPOSES[form].map((key) => (
        <PurposeRow
          key={key}
          purposeKey={key}
          formKey={form}
          error={fieldErrors?.[`consent.${key}`]}
        />
      ))}

      <p className="pt-1 text-meta text-ink-soft">
        You can change any of this later, or withdraw it entirely, from your{" "}
        <Link href="/account/consent" className="underline hover:text-ink">
          consent settings
        </Link>
        {" — "}withdrawing is one click, the same as giving it. See the{" "}
        <Link href="/privacy" className="underline hover:text-ink">
          privacy policy
        </Link>{" "}
        for the full detail.
      </p>
    </fieldset>
  );
}
