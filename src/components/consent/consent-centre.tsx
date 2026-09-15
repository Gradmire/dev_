"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock } from "lucide-react";
import Link from "next/link";
import { setConsent } from "@/lib/actions/consent";
import { CONSENT_PURPOSES, PURPOSE_ORDER, type PurposeKey } from "@/lib/consent/purposes";
import type { ConsentState } from "@/lib/consent/record";
import type { FormState } from "@/lib/actions/consultation";
import { cn } from "@/lib/utils";

const initial: FormState = { ok: false };

function ToggleButton({ granted }: { granted: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "shrink-0 rounded-pill border px-4 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60",
        granted
          ? "border-line bg-white text-ink hover:border-destructive hover:text-destructive"
          : "border-ink bg-ink text-paper hover:bg-navy",
      )}
    >
      {pending ? "Saving…" : granted ? "Withdraw" : "Turn on"}
    </button>
  );
}

function PurposeCard({
  purposeKey,
  decision,
}: {
  purposeKey: PurposeKey;
  decision?: ConsentState[PurposeKey];
}) {
  const purpose = CONSENT_PURPOSES[purposeKey];
  const [state, formAction] = useActionState(setConsent, initial);
  const granted = decision?.granted === true;

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 sm:p-6",
        granted ? "border-brandgreen/30 bg-brandgreen-dim" : "border-line bg-white",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <h3 className="text-[17px] font-semibold text-ink">{purpose.label}</h3>
            <span
              className={cn(
                "rounded-pill px-2.5 py-0.5 font-mono text-micro uppercase tracking-wider",
                granted ? "bg-brandgreen text-white" : "bg-paper-dim text-ink-soft",
              )}
            >
              {granted ? "On" : "Off"}
            </span>
            {purpose.required && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-paper-dim px-2.5 py-0.5 font-mono text-micro uppercase tracking-wider text-ink-soft">
                <Lock size={10} aria-hidden="true" /> Essential
              </span>
            )}
          </div>

          <p className="max-w-[60ch] text-ui text-ink-soft">{purpose.description}</p>

          <dl className="mt-3.5 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-micro uppercase tracking-[0.1em] text-ink-soft">
                What we hold
              </dt>
              <dd className="mt-1 text-meta text-ink-soft">
                {purpose.dataCategories.join(" · ")}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-micro uppercase tracking-[0.1em] text-ink-soft">
                How long
              </dt>
              <dd className="mt-1 text-meta text-ink-soft">{purpose.retention}</dd>
            </div>
          </dl>

          {decision && (
            <p className="mt-3 font-mono text-micro uppercase tracking-[0.1em] text-ink-soft">
              {granted ? "Agreed" : "Withdrawn"}{" "}
              <time dateTime={new Date(decision.at).toISOString()}>
                {new Date(decision.at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </time>
              {" · notice "}
              {decision.noticeVersion}
            </p>
          )}

          {/*
            The wording changed after they agreed. Shown rather than silently
            re-interpreted: old consent does not cover new terms, and pretending
            it does is the failure this version stamp exists to catch.
          */}
          {decision?.stale && granted && (
            <p className="mt-2 rounded-lg bg-paper-dim px-3 py-2 text-meta text-ink-soft">
              We&rsquo;ve updated the wording for this since you agreed. Withdraw and
              turn it back on to accept the current version.
            </p>
          )}
        </div>

        {purpose.required ? (
          <p className="max-w-[22ch] text-meta text-ink-soft">
            Needed to run your application.{" "}
            <Link href="/account/data#delete" className="underline hover:text-ink">
              Delete my account
            </Link>{" "}
            withdraws it.
          </p>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="purposeKey" value={purposeKey} />
            <input type="hidden" name="granted" value={granted ? "false" : "true"} />
            <ToggleButton granted={granted} />
          </form>
        )}
      </div>

      <AnimatePresence initial={false}>
        {state.message && (
          <motion.p
            key={`${purposeKey}-status`}
            role="status"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "mt-3.5 flex items-start gap-1.5 text-meta",
              state.ok ? "text-brandgreen" : "text-destructive",
            )}
          >
            {state.ok && <Check size={13} className="mt-0.5 shrink-0" aria-hidden="true" />}
            {state.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ConsentCentre({ state }: { state: ConsentState }) {
  return (
    <div className="space-y-4">
      {PURPOSE_ORDER.map((key) => (
        <PurposeCard key={key} purposeKey={key} decision={state[key]} />
      ))}
    </div>
  );
}
