import { SITE_URL, CONTACT_EMAIL } from "@/config/site";
import type { EmailMessage } from "./send";

/**
 * Transactional email bodies. Plain text, and deliberately specific about
 * who is writing and why: a parent receiving this has never heard of us, and
 * a vague "someone has requested access" reads like a phishing attempt.
 */

export function parentalConsentEmail(params: {
  parentEmail: string;
  parentName?: string | null;
  childName: string;
  childEmail: string;
  token: string;
  expiresAt: Date;
}): EmailMessage {
  const link = `${SITE_URL}/parental-consent/${params.token}`;
  const expires = params.expiresAt.toLocaleString("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  });

  return {
    to: params.parentEmail,
    subject: `Permission needed: ${params.childName}'s Gradmire enquiry`,
    text: `${params.parentName ? `Hello ${params.parentName},` : "Hello,"}

${params.childName} (${params.childEmail}) has asked Gradmire for help applying
to a UK university, and told us they are under 18. They gave us this address as
their parent or guardian's.

Indian data protection law requires us to have your permission before we do
anything with a child's personal information beyond holding the initial
enquiry. Until you confirm, their enquiry stays exactly where it is — we will
not progress an application, contact universities, or send them anything.

Confirm or decline here:
${link}

This link expires on ${expires} (UTC) and can only be used once.

What we would hold: their name, email address, phone number if given, date of
birth, and the course they are interested in. What we would do with it: give
them course advice and, if they go ahead, handle their application. We do not
sell personal information, and we do not advertise to children.

If you were not expecting this email, you can ignore it — nothing happens
without your confirmation. If you think the address was given in error, tell us
at ${CONTACT_EMAIL} and we will delete the enquiry.

Gradmire
${SITE_URL}/privacy`,
  };
}

export function parentalConsentOutcomeEmail(params: {
  childEmail: string;
  childName: string;
  granted: boolean;
}): EmailMessage {
  return {
    to: params.childEmail,
    subject: params.granted
      ? "Your Gradmire enquiry is unblocked"
      : "Your Gradmire enquiry is on hold",
    text: params.granted
      ? `Hello ${params.childName},

Your parent or guardian has confirmed permission, so a counselor can now pick
up your enquiry. Expect to hear from us within one working day.

You can see and change what you have agreed to at any time:
${SITE_URL}/account/consent

Gradmire`
      : `Hello ${params.childName},

Your parent or guardian has declined permission, so we cannot take your enquiry
any further. We have stopped processing it.

If this was a mistake, or you would like us to delete what we hold, email
${CONTACT_EMAIL}.

Gradmire`,
  };
}
