"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, MailX } from "lucide-react";
import Link from "next/link";
import { unsubscribeByToken, type UnsubscribeResult } from "@/lib/actions/newsletter";
import { CtaButton } from "@/components/ui/cta";

/**
 * One button, one click.
 *
 * It is a POST rather than the link acting on its own, and that is not extra
 * friction for the person — it is protection from the mail clients and
 * security scanners that fetch every URL in an inbound message. A GET that
 * unsubscribed on load would quietly opt people out of email they wanted, and
 * the first they would know of it is the reminder that never arrived.
 */
async function action(
  _prev: UnsubscribeResult | null,
  formData: FormData,
): Promise<UnsubscribeResult> {
  return unsubscribeByToken(String(formData.get("token") ?? ""));
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <CtaButton type="submit" disabled={pending} size="md">
      {pending ? "Unsubscribing…" : "Yes, unsubscribe me"}
    </CtaButton>
  );
}

export function UnsubscribeButton({ token }: { token: string }) {
  const [state, formAction] = useActionState<UnsubscribeResult | null, FormData>(
    action,
    null,
  );

  if (state?.state === "done" || state?.state === "already") {
    return (
      <div className="rounded-2xl border border-brandgreen/30 bg-brandgreen-dim p-8 text-center">
        <CheckCircle2 size={30} className="mx-auto mb-3.5 text-brandgreen" aria-hidden="true" />
        <h2 className="mb-2 text-[20px] font-semibold text-ink">
          {state.state === "done" ? "You're unsubscribed" : "Already unsubscribed"}
        </h2>
        <p role="status" className="mx-auto mb-5 max-w-[44ch] text-ui text-ink-soft">
          We&rsquo;ve stopped sending deadline reminders to {state.email}. This
          doesn&rsquo;t affect anything else — if you have an application with us,
          your counselor will still be in touch about it.
        </p>
        <Link href="/" className="text-ui text-ink-soft underline hover:text-ink">
          Back to Gradmire
        </Link>
      </div>
    );
  }

  if (state?.state === "invalid") {
    return (
      <div className="rounded-2xl border border-line bg-paper-dim p-8 text-center">
        <MailX size={30} className="mx-auto mb-3.5 text-ink-soft" aria-hidden="true" />
        <h2 className="mb-2 text-[20px] font-semibold text-ink">
          That link isn&rsquo;t valid
        </h2>
        <p role="alert" className="mx-auto max-w-[44ch] text-ui text-ink-soft">
          Check you copied the whole link from the email. You can also manage this
          from your{" "}
          <Link href="/account/consent" className="underline hover:text-ink">
            consent settings
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="token" value={token} />
      <Submit />
    </form>
  );
}
