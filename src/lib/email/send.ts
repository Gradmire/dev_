import "server-only";

/**
 * Outbound email.
 *
 * There was no mailer in this codebase at all — `LEADS_NOTIFICATION_EMAIL`
 * was configured and nothing ever sent to it. The parental consent flow is
 * the first thing that genuinely cannot work without one, so this is the
 * smallest transport that does the job: Resend's HTTP API via `fetch`, with
 * no new dependency.
 *
 * When `RESEND_API_KEY` is absent — local development, and any deploy that
 * has not set it yet — sending is logged rather than silently dropped, and
 * the caller is told `delivered: false`. Callers must surface that rather
 * than reporting success: telling a 17-year-old their parent has been
 * emailed when nothing was sent is worse than telling them it failed.
 */

export type SendResult = {
  delivered: boolean;
  /** Set when delivery failed or was skipped, for logs and the UI. */
  reason?: "not_configured" | "provider_error";
  id?: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  /** Plain text. Every message here is transactional and reads fine unstyled. */
  text: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Gradmire <no-reply@gradmire.com>";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!isEmailConfigured()) {
    // Loud, and with the body, so a developer running locally can follow the
    // link out of the terminal instead of being stuck at a dead end.
    console.warn(
      `[email] RESEND_API_KEY not set — not sending.\n  to: ${message.to}\n  subject: ${message.subject}\n${message.text}`,
    );
    return { delivered: false, reason: "not_configured" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });

    if (!response.ok) {
      // The body can echo the recipient address; log the status only.
      console.error(`[email] provider rejected send: ${response.status}`);
      return { delivered: false, reason: "provider_error" };
    }

    const data = (await response.json()) as { id?: string };
    return { delivered: true, id: data.id };
  } catch (error) {
    console.error("[email] send failed", error);
    return { delivered: false, reason: "provider_error" };
  }
}
