import type { Metadata } from "next";
import Link from "next/link";
import { requireAccount } from "@/lib/auth";
import { getConsentState, getConsentHistory } from "@/lib/consent/record";
import { parentalGate } from "@/lib/consent/parental";
import { ConsentCentre } from "@/components/consent/consent-centre";
import { ParentalConsentStep } from "@/components/consent/parental-consent-step";
import { CONSENT_PURPOSES, isPurposeKey } from "@/lib/consent/purposes";

export const metadata: Metadata = {
  title: "Consent settings",
  robots: { index: false, follow: false },
};

/** Consent state changes the moment they toggle something. Never cached. */
export const dynamic = "force-dynamic";

function GateNotice({
  gate,
  email,
  name,
}: {
  gate: Awaited<ReturnType<typeof parentalGate>>;
  email: string;
  name?: string | null;
}) {
  if (gate.state === "not_required" || gate.state === "unknown_age") return null;

  if (gate.state === "verified") {
    return (
      <div className="mb-8 rounded-2xl border border-brandgreen/30 bg-brandgreen-dim p-5">
        <h2 className="mb-1 text-[16px] font-semibold text-ink">
          Guardian permission confirmed
        </h2>
        <p className="text-ui text-ink-soft">
          {gate.parentEmail} confirmed on{" "}
          {gate.verifiedAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          , so a counselor can work on your applications.
        </p>
      </div>
    );
  }

  if (gate.state === "pending") {
    return (
      <div className="mb-8 rounded-2xl border border-sky/40 bg-sky-dim p-5">
        <h2 className="mb-1 text-[16px] font-semibold text-ink">
          Waiting on your parent or guardian
        </h2>
        <p className="text-ui text-ink-soft">
          We emailed {gate.parentEmail} and the link is valid until{" "}
          {gate.expiresAt.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          . Until they confirm, your enquiry stays on hold — we hold your details
          and do nothing else with them.
        </p>
      </div>
    );
  }

  // required, declined or expired — all need a fresh request.
  return (
    <div className="mb-8">
      <ParentalConsentStep
        subjectEmail={email}
        subjectName={name ?? undefined}
        intro={
          gate.state === "declined"
            ? "Your parent or guardian declined, so we've stopped work on your enquiry. If that was a mistake, you can send the request again — to them or to a different guardian."
            : gate.state === "expired"
              ? "The permission link we sent expired before it was used. Send a new one and it'll be valid for another 72 hours."
              : undefined
        }
      />
    </div>
  );
}

export default async function ConsentSettingsPage() {
  const { email, applicant } = await requireAccount();

  const [state, history, gate] = await Promise.all([
    getConsentState(email),
    getConsentHistory(email),
    parentalGate(email, applicant?.dateOfBirth),
  ]);

  return (
    <>
      <span className="eyebrow">Your permission</span>
      <h1 className="mb-2 mt-3 text-[clamp(26px,3.4vw,38px)] font-semibold">
        Consent settings
      </h1>
      <p className="mb-9 max-w-[62ch] text-lede text-ink-soft">
        Everything you&rsquo;ve agreed to, itemised. Turn any optional purpose off
        and we stop that use immediately — it won&rsquo;t affect anything else,
        and it takes exactly as long as agreeing did.
      </p>

      <GateNotice gate={gate} email={email} name={applicant?.fullName} />

      <ConsentCentre state={state} />

      <section className="mt-12">
        <h2 className="mb-1.5 text-[20px] font-semibold">Your consent history</h2>
        <p className="mb-5 max-w-[62ch] text-ui text-ink-soft">
          Every decision you&rsquo;ve made, kept as a record so both of us can see
          what was agreed and when. We never edit these — a withdrawal is added to
          the list rather than replacing what came before.
        </p>

        {history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line bg-paper-dim p-6 text-center text-ui text-ink-soft">
            Nothing recorded yet.
          </p>
        ) : (
          <div className="scroll-x-hint overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[540px] border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-paper-dim">
                  {["When", "What", "Decision", "Notice"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 font-mono text-micro uppercase tracking-[0.1em] text-ink-soft"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-meta text-ink-soft">
                      <time dateTime={row.createdAt.toISOString()}>
                        {row.createdAt.toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </td>
                    <td className="px-4 py-3 text-meta text-ink">
                      {isPurposeKey(row.purposeKey)
                        ? CONSENT_PURPOSES[row.purposeKey].label
                        : row.purposeKey}
                    </td>
                    <td className="px-4 py-3 text-meta">
                      <span
                        className={
                          row.granted ? "font-medium text-brandgreen" : "text-ink-soft"
                        }
                      >
                        {row.granted ? "Agreed" : "Withdrawn"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-micro text-ink-soft">
                      {row.noticeVersion}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="mt-9 text-meta text-ink-soft">
        Something not right?{" "}
        <Link href="/grievance" className="underline hover:text-ink">
          Raise it with our Grievance Officer
        </Link>
        .
      </p>
    </>
  );
}
