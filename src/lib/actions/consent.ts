"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAccount } from "@/lib/auth";
import {
  CONSENT_PURPOSES,
  PURPOSE_ORDER,
  isPurposeKey,
  type PurposeKey,
} from "@/lib/consent/purposes";
import { recordConsentDecisions } from "@/lib/consent/record";
import { generateToken } from "@/lib/tokens";
import type { FormState } from "@/lib/actions/consultation";

/**
 * The consent centre's write path.
 *
 * Handles one purpose per submission rather than saving the whole page,
 * because the guarantee that matters here is that withdrawing marketing
 * consent does not touch — and cannot accidentally revoke — the consent that
 * keeps someone's application alive (s.6(6)). One toggle, one row, no
 * opportunity for a stale form to carry an old value for a neighbouring
 * purpose back into the ledger.
 */
export async function setConsent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { email, user } = await requireAccount();

  const purposeKey = String(formData.get("purposeKey") ?? "");
  const granted = formData.get("granted") === "true";

  if (!isPurposeKey(purposeKey)) {
    return { ok: false, message: "That isn't something we ask consent for." };
  }

  const purpose = CONSENT_PURPOSES[purposeKey];

  // A required purpose is the service itself. Withdrawing it is a deletion
  // request, not a toggle, and pretending otherwise would leave an account
  // that exists but may not be processed.
  if (purpose.required && !granted) {
    return {
      ok: false,
      message:
        "This one is what lets us handle your application at all, so it can't be switched off on its own. Use Delete my account below to withdraw it and have your data erased.",
    };
  }

  try {
    await recordConsentDecisions({
      subjectEmail: email,
      authUserId: user.id,
      source: "consent-centre",
      decisions: { [purposeKey]: granted } as Partial<Record<PurposeKey, boolean>>,
    });

    // Marketing consent has a second home: the subscriber table is what a
    // future send would actually read, so the ledger and the list have to
    // move together or one of them is lying.
    if (purposeKey === "marketing_email") {
      if (granted) {
        await db
          .insert(schema.newsletterSubscribers)
          .values({ email, confirmed: true, unsubscribeToken: generateToken() })
          .onConflictDoUpdate({
            target: schema.newsletterSubscribers.email,
            set: { unsubscribedAt: null, confirmed: true },
          });
      } else {
        await db
          .update(schema.newsletterSubscribers)
          .set({ unsubscribedAt: new Date(), confirmed: false })
          .where(eq(schema.newsletterSubscribers.email, email));
      }
    }
  } catch (error) {
    console.error("[consent] failed to record decision", error);
    return { ok: false, message: "We couldn't save that just now. Try again shortly." };
  }

  revalidatePath("/account/consent");
  return {
    ok: true,
    message: granted
      ? `Saved — "${purpose.label.toLowerCase()}" is on.`
      : `Saved — we've stopped "${purpose.label.toLowerCase()}".`,
  };
}

export { PURPOSE_ORDER };
