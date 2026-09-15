"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { recordConsentDecisions } from "@/lib/consent/record";

/**
 * One-click unsubscribe.
 *
 * `unsubscribedAt` and a `confirmed` flag existed on the table from the
 * start; nothing ever set either, and there was no route to reach them. So
 * the only way to stop the emails was to email and ask — which is not
 * withdrawal being "as easy as giving" consent (DPDP s.6(4)), it is
 * withdrawal being materially harder.
 *
 * Token-based and unauthenticated on purpose: nobody needs an account to
 * subscribe, so nobody should need one to leave. The token grants exactly one
 * capability — stopping mail to one address — so its blast radius if leaked
 * is that someone is unsubscribed, which they can undo by subscribing again.
 */
export type UnsubscribeResult =
  | { state: "done"; email: string }
  | { state: "already"; email: string }
  | { state: "invalid" };

export async function unsubscribeByToken(token: string): Promise<UnsubscribeResult> {
  if (!token || token.length < 10) return { state: "invalid" };

  const subscriber = await db.query.newsletterSubscribers.findFirst({
    where: eq(schema.newsletterSubscribers.unsubscribeToken, token),
  });

  if (!subscriber) return { state: "invalid" };
  if (subscriber.unsubscribedAt) {
    return { state: "already", email: subscriber.email };
  }

  try {
    await db
      .update(schema.newsletterSubscribers)
      .set({ unsubscribedAt: new Date(), confirmed: false })
      .where(eq(schema.newsletterSubscribers.id, subscriber.id));

    // The withdrawal joins the ledger as its own row, so the record shows
    // consent given and then taken back rather than consent simply vanishing.
    await recordConsentDecisions({
      subjectEmail: subscriber.email,
      source: "unsubscribe-link",
      decisions: { marketing_email: false },
    });
  } catch (error) {
    console.error("[newsletter] unsubscribe failed", error);
    return { state: "invalid" };
  }

  return { state: "done", email: subscriber.email };
}
