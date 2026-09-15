import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm } from "@/components/admin/action-form";
import { updateLeadStatus, claimLead } from "@/lib/actions/admin";
import { requireStaff, scopeToStaff } from "@/lib/auth";
import { logStaffAccess } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const context = await requireStaff();

  const leads = await db.query.leads.findMany({
    // A counselor sees their own plus the unclaimed intake pool; an admin
    // sees everything. See scopeToStaff for why unassigned is included.
    where: scopeToStaff(context, schema.leads.assignedStaffId, {
      includeUnassigned: true,
    }),
    orderBy: [desc(schema.leads.createdAt)],
    limit: 100,
    with: {
      courseHub: { columns: { name: true } },
      assignedStaff: { columns: { id: true, fullName: true, email: true } },
    },
  });

  await logStaffAccess(context, {
    action: "list",
    resourceType: "leads",
    rowCount: leads.length,
  });

  return (
    <>
      <h1 className="mb-2 text-[30px] font-semibold">Leads</h1>
      <p className="mb-8 text-[14.5px] text-ink-soft">
        {context.isAdmin
          ? "Every consultation request, newest first."
          : "Your enquiries, plus any not yet claimed by a counselor. Newest first."}
      </p>

      {leads.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-ui text-ink-soft">
          No enquiries yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-[17px] font-semibold">{lead.fullName}</h2>
                  <p className="text-body text-ink-soft">
                    <a href={`mailto:${lead.email}`} className="underline">
                      {lead.email}
                    </a>
                    {lead.phone && ` · ${lead.phone}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="block font-mono text-mini uppercase tracking-wider text-ink-soft">
                    {lead.createdAt.toLocaleString("en-GB")}
                  </span>
                  <span className="mt-1 block font-mono text-mini uppercase tracking-wider">
                    {lead.assignedStaff ? (
                      <span className="text-ink-soft">
                        {lead.assignedStaff.id === context.staff.id
                          ? "Yours"
                          : (lead.assignedStaff.fullName ?? lead.assignedStaff.email)}
                      </span>
                    ) : (
                      <span className="text-sky-text">Unclaimed</span>
                    )}
                  </span>
                </div>
              </div>

              <dl className="mb-3 grid gap-2 text-body sm:grid-cols-3">
                <div>
                  <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-soft">Course</dt>
                  <dd>{lead.courseHub?.name ?? "Not sure yet"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-soft">Intake</dt>
                  <dd>{lead.preferredIntake ?? "—"}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10.5px] uppercase tracking-wider text-ink-soft">From page</dt>
                  <dd className="truncate">{lead.sourcePath ?? "—"}</dd>
                </div>
              </dl>

              {lead.message && (
                <p className="mb-3 rounded-lg bg-paper-dim px-4 py-3 text-body">
                  {lead.message}
                </p>
              )}

              {!lead.assignedStaffId && (
                <ActionForm action={claimLead} submitLabel="Claim this enquiry">
                  <input type="hidden" name="leadId" value={lead.id} />
                </ActionForm>
              )}

              <ActionForm action={updateLeadStatus} submitLabel="Update">
                <input type="hidden" name="leadId" value={lead.id} />
                <label htmlFor={`status-${lead.id}`} className="sr-only">
                  Status for {lead.fullName}
                </label>
                <select
                  id={`status-${lead.id}`}
                  name="status"
                  defaultValue={lead.status}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-[13px]"
                >
                  {schema.leadStatus.enumValues.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
