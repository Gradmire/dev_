"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { dateOfBirthBounds, isMinor } from "@/lib/consent/age";
import { cn } from "@/lib/utils";

/**
 * Date of birth, with the under-18 consequence shown as soon as it is known.
 *
 * The inline notice is the point of the component. Telling someone only after
 * they submit that their enquiry is on hold reads as a rejection; telling them
 * as they type reads as what it is — an extra step, with a reason.
 *
 * `min`/`max` bound the native picker so a mistyped year cannot land in the
 * future, which `ageOn` would have to score as "unknown" — the one answer
 * that skips the parental consent gate entirely.
 */
export function DateOfBirthField({
  id = "field-dateOfBirth",
  name = "dateOfBirth",
  required,
  errors,
  className,
}: {
  id?: string;
  name?: string;
  required?: boolean;
  errors?: string[];
  className?: string;
}) {
  const [value, setValue] = useState("");
  const bounds = dateOfBirthBounds();
  const minor = value.length === 10 && isMinor(value);
  const errId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-body font-medium text-ink">
        Date of birth {required && <span className="text-sky-text">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type="date"
        required={required}
        min={bounds.min}
        max={bounds.max}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errId : `${id}-why`}
        className={cn(
          "w-full rounded-lg border bg-white px-3.5 py-2.5 text-[16px] text-ink sm:text-[14.5px]",
          errors ? "border-destructive" : "border-line",
        )}
      />

      {errors ? (
        <p id={errId} className="mt-1.5 text-meta text-destructive">
          {errors[0]}
        </p>
      ) : (
        <p id={`${id}-why`} className="mt-1.5 text-meta text-ink-soft">
          Universities set minimum ages, and data protection law gives under-18s
          extra protection — so we have to ask.
        </p>
      )}

      {minor && (
        <div
          role="status"
          className="mt-2.5 flex gap-2.5 rounded-lg border border-sky/40 bg-sky-dim p-3 text-meta text-ink"
        >
          <Info size={15} className="mt-0.5 shrink-0 text-sky-text" aria-hidden="true" />
          <p>
            You&rsquo;re under 18, so after this we&rsquo;ll ask for a parent or
            guardian&rsquo;s email and get their permission before a counselor
            picks things up. It takes them one click.
          </p>
        </div>
      )}
    </div>
  );
}
