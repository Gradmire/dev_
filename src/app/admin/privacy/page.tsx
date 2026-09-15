import { desc, eq, or, count } from "drizzle-orm";
import { ShieldAlert, Clock } from "lucide-react";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { logStaffAccess } from "@/lib/audit";
import { RIGHTS_SLA } from "@/config/site";
import { CONSENT_PURPOSES, isPurposeKey } from "@/lib/consent/purposes";
import { ActionForm } from "@/components/admin/action-form";
import { Pager } from "@/components/admin/pager";
import { readPage, pageInfo } from "@/lib/pagination";
import { resolveCorrectionRequest, resolveGrievance } from "@/lib/actions/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy & rights" };

/**
 * Admin-only. Everything here is cross-cutting by nature — the consent
 * ledger, other people's rights requests, and the audit trail that records
 * what counselors have been reading. A counselor having sight of any of it
 * would defeat the scoping applied everywhere else, and the audit trail in
 * particular must not be readable by the accounts it exists to hold to
 * account.
 */

const cellCls = "px-4 py-3 text-body";
const headCls =
  "px-4 py-3 text-left font-mono text-mini font-medium uppercase tracking-[0.08em] text-ink-soft";

function Panel({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-1.5 text-[20px] font-semibold">{title}</h2>
      <p className="mb-5 max-w-[70ch] text-body text-ink-soft">{lede}</p>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-ui text-ink-soft">
      {children}
    </p>
  );
}

export default async function AdminPrivacyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAdmin();
  const now = new Date();
  const params = await searchParams;

  // The two append-only ledgers are the only lists here that grow without
  // bound — one row per consent decision, one per personal-data access — so
  // they page, on separate parameters so neither resets the other. The
  // request queues are bounded by how many are actually outstanding.
  const consentPage = readPage(params, { key: "consent", pageSize: 40 });
  const accessPage = readPage(params, { key: "access", pageSize: 50 });

  const [
    corrections,
    grievanceRows,
    deletions,
    exports,
    recentConsent,
    recentAccess,
    consentTotal,
    accessTotal,
  ] = await Promise.all([
      db.query.correctionRequests.findMany({
        where: or(
          eq(schema.correctionRequests.status, "received"),
          eq(schema.correctionRequests.status, "in_progress"),
        ),
        orderBy: [desc(schema.correctionRequests.createdAt)],
        limit: 50,
      }),
      db.query.grievances.findMany({
        orderBy: [desc(schema.grievances.createdAt)],
        limit: 50,
      }),
      db.query.deletionRequests.findMany({
        orderBy: [desc(schema.deletionRequests.createdAt)],
        limit: 20,
      }),
      db.query.dataExportRequests.findMany({
        orderBy: [desc(schema.dataExportRequests.createdAt)],
        limit: 20,
      }),
      db.query.consentRecords.findMany({
        orderBy: [desc(schema.consentRecords.createdAt)],
        limit: consentPage.pageSize,
        offset: consentPage.offset,
      }),
      db.query.accessLogs.findMany({
        orderBy: [desc(schema.accessLogs.createdAt)],
        limit: accessPage.pageSize,
        offset: accessPage.offset,
      }),
      db.select({ n: count() }).from(schema.consentRecords),
      db.select({ n: count() }).from(schema.accessLogs),
    ]);

  const consentInfo = pageInfo(consentPage, consentTotal[0]?.n ?? 0);
  const accessInfo = pageInfo(accessPage, accessTotal[0]?.n ?? 0);

  // Reading the ledger is itself an access to personal data, and is logged
  // like any other. An audit surface exempt from its own audit is theatre.
  await logStaffAccess(context, {
    action: "consent_read",
    resourceType: "consent_records",
    rowCount: recentConsent.length,
  });

  const openGrievances = grievanceRows.filter(
    (g) => g.status === "received" || g.status === "in_progress",
  );
  const overdue = openGrievances.filter((g) => g.responseDueAt < now);

  return (
    <>
      <h1 className="mb-2 text-[30px] font-semibold">Privacy &amp; rights</h1>
      <p className="mb-9 max-w-[70ch] text-[14.5px] text-ink-soft">
        Data principal requests, the consent ledger, and the record of who has
        been reading personal data. Admin only.
      </p>

      {overdue.length > 0 && (
        <div className="mb-10 flex gap-3 rounded-2xl border-l-[3px] border-destructive bg-destructive/[0.04] px-5 py-4">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <h2 className="mb-1 text-lede font-semibold">
              {overdue.length} grievance{overdue.length === 1 ? "" : "s"} past the{" "}
              {RIGHTS_SLA.grievanceDays}-day deadline
            </h2>
            <p className="text-body text-ink-soft">
              The deadline was published to the complainant when they submitted.
              Missing it is itself a compliance failure, not just a late reply:{" "}
              {overdue.map((g) => g.reference).join(", ")}.
            </p>
          </div>
        </div>
      )}

      <Panel
        title="Grievances"
        lede={`Formal complaints under s.13. Each carries the response deadline that was promised at submission — stamped on the row, so a change to our published SLA cannot move a date someone was already given.`}
      >
        {grievanceRows.length === 0 ? (
          <Empty>No grievances raised.</Empty>
        ) : (
          <ul className="space-y-4">
            {grievanceRows.map((g) => {
              const isOverdue =
                g.responseDueAt < now && g.status !== "resolved";
              return (
                <li
                  key={g.id}
                  className={`rounded-2xl border bg-white p-5 ${
                    isOverdue ? "border-destructive/40" : "border-line"
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-mini uppercase tracking-wider text-ink-soft">
                        {g.reference} · {g.category}
                      </span>
                      <h3 className="mt-1 text-[16px] font-semibold">
                        {g.subjectName ?? "—"}{" "}
                        <span className="font-normal text-ink-soft">{g.subjectEmail}</span>
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-mono text-mini uppercase ${
                        isOverdue
                          ? "bg-destructive text-white"
                          : "bg-paper-dim text-ink-soft"
                      }`}
                    >
                      <Clock size={11} aria-hidden="true" />
                      due {g.responseDueAt.toLocaleDateString("en-GB")}
                    </span>
                  </div>

                  <p className="mb-3 rounded-lg bg-paper-dim px-4 py-3 text-body">{g.details}</p>

                  {g.resolutionNote && (
                    <p className="mb-3 border-l-[3px] border-sky pl-3 text-body">
                      {g.resolutionNote}
                    </p>
                  )}

                  {g.status !== "resolved" && (
                    <ActionForm action={resolveGrievance} submitLabel="Record response">
                      <input type="hidden" name="grievanceId" value={g.id} />
                      <label htmlFor={`grv-note-${g.id}`} className="sr-only">
                        Resolution for {g.reference}
                      </label>
                      <input
                        id={`grv-note-${g.id}`}
                        name="resolutionNote"
                        required
                        placeholder="What we did about it"
                        className="min-w-[260px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[13px]"
                      />
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Correction requests"
        lede={`Fields the person could not edit themselves. Committed to ${RIGHTS_SLA.correctionDays} days.`}
      >
        {corrections.length === 0 ? (
          <Empty>Nothing outstanding.</Empty>
        ) : (
          <ul className="space-y-4">
            {corrections.map((c) => (
              <li key={c.id} className="rounded-2xl border border-line bg-white p-5">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="font-mono text-mini uppercase tracking-wider text-ink-soft">
                    {c.createdAt.toLocaleDateString("en-GB")} · {c.subjectEmail}
                  </span>
                  <span className="rounded-pill bg-paper-dim px-2.5 py-1 font-mono text-mini uppercase">
                    {c.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mb-3 rounded-lg bg-paper-dim px-4 py-3 text-body">{c.details}</p>
                <ActionForm action={resolveCorrectionRequest} submitLabel="Mark done">
                  <input type="hidden" name="requestId" value={c.id} />
                  <label htmlFor={`corr-note-${c.id}`} className="sr-only">
                    Resolution note
                  </label>
                  <input
                    id={`corr-note-${c.id}`}
                    name="resolutionNote"
                    required
                    placeholder="What was corrected"
                    className="min-w-[260px] flex-1 rounded-lg border border-line bg-white px-3 py-2 text-[13px]"
                  />
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Erasures and exports"
        lede="Completed self-service requests. The erasure rows are the proof the obligation was discharged, including what had to be retained and why."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b border-line">
                  {["Erasure", "When", "Status"].map((h) => (
                    <th key={h} scope="col" className={headCls}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deletions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={`${cellCls} text-center text-ink-soft`}>
                      None yet.
                    </td>
                  </tr>
                ) : (
                  deletions.map((d) => (
                    <tr key={d.id} className="border-b border-line last:border-0">
                      <td className={`${cellCls} font-mono text-meta`}>{d.subjectEmail}</td>
                      <td className={`${cellCls} text-ink-soft`}>
                        {d.createdAt.toLocaleDateString("en-GB")}
                      </td>
                      <td className={cellCls}>{d.status.replace("_", " ")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b border-line">
                  {["Export", "When", "Format"].map((h) => (
                    <th key={h} scope="col" className={headCls}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exports.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={`${cellCls} text-center text-ink-soft`}>
                      None yet.
                    </td>
                  </tr>
                ) : (
                  exports.map((e) => (
                    <tr key={e.id} className="border-b border-line last:border-0">
                      <td className={`${cellCls} font-mono text-meta`}>{e.subjectEmail}</td>
                      <td className={`${cellCls} text-ink-soft`}>
                        {e.createdAt.toLocaleDateString("en-GB")}
                      </td>
                      <td className={`${cellCls} uppercase`}>{e.format}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      <Panel
        title="Consent ledger"
        lede="The most recent consent decisions across everyone. Append-only — a withdrawal is a new row, never an edit, so this is the evidence that processing had a lawful basis at any given moment."
      >
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line">
                {["When", "Who", "Purpose", "Decision", "Source", "Notice"].map((h) => (
                  <th key={h} scope="col" className={headCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentConsent.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className={`${cellCls} font-mono text-meta text-ink-soft`}>
                    {row.createdAt.toLocaleString("en-GB")}
                  </td>
                  <td className={`${cellCls} font-mono text-meta`}>{row.subjectEmail}</td>
                  <td className={cellCls}>
                    {isPurposeKey(row.purposeKey)
                      ? CONSENT_PURPOSES[row.purposeKey].label
                      : row.purposeKey}
                  </td>
                  <td className={cellCls}>
                    <span className={row.granted ? "text-brandgreen" : "text-ink-soft"}>
                      {row.granted ? "Agreed" : "Withdrawn"}
                    </span>
                  </td>
                  <td className={`${cellCls} text-ink-soft`}>{row.source ?? "—"}</td>
                  <td className={`${cellCls} font-mono text-meta text-ink-soft`}>
                    {row.noticeVersion}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager
          info={consentInfo}
          basePath="/admin/privacy"
          searchParams={params}
          label="consent records"
        />
      </Panel>

      <Panel
        title="Access trail"
        lede="Who read personal data, and how much of it. Records the shape of each access — a subject and a row count — never the rows themselves, so the audit log cannot become a second copy of the data it audits."
      >
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line">
                {["When", "Actor", "Action", "Resource", "Subject", "Rows"].map((h) => (
                  <th key={h} scope="col" className={headCls}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAccess.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className={`${cellCls} font-mono text-meta text-ink-soft`}>
                    {row.createdAt.toLocaleString("en-GB")}
                  </td>
                  <td className={`${cellCls} font-mono text-meta`}>
                    {row.actorEmail ?? row.actorType}
                  </td>
                  <td className={cellCls}>{row.action}</td>
                  <td className={`${cellCls} text-ink-soft`}>{row.resourceType}</td>
                  <td className={`${cellCls} font-mono text-meta text-ink-soft`}>
                    {row.subjectEmail ?? "—"}
                  </td>
                  <td className={`${cellCls} tabular text-ink-soft`}>
                    {row.rowCount ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager
          info={accessInfo}
          basePath="/admin/privacy"
          searchParams={params}
          label="access records"
        />
      </Panel>
    </>
  );
}
