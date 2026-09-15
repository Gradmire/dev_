import { desc, asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, FieldLabel } from "@/components/admin/action-form";
import { updateApplicationStage, createApplication } from "@/lib/actions/admin";
import { STAGES, stageLabel } from "@/lib/stages";
import { currentIntake } from "@/config/site";
import { requireStaff, scopeToStaff } from "@/lib/auth";
import { logStaffAccess } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Applications" };

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-body";

export default async function ApplicationsPage() {
  const context = await requireStaff();

  const [applications, hubs] = await Promise.all([
    db.query.applications.findMany({
      // Counselors see the caseload they are assigned; admins see all of it.
      where: scopeToStaff(context, schema.applications.assignedStaffId, {
        includeUnassigned: true,
      }),
      orderBy: [desc(schema.applications.updatedAt)],
      limit: 100,
      with: { applicant: true },
    }),
    db.query.courseHubs.findMany({
      orderBy: [asc(schema.courseHubs.sortOrder)],
      columns: { id: true, name: true },
      limit: 200,
    }),
  ]);

  await logStaffAccess(context, {
    action: "list",
    resourceType: "applications",
    rowCount: applications.length,
  });

  return (
    <>
      <h1 className="mb-2 text-[30px] font-semibold">Applications</h1>
      <p className="mb-8 text-[14.5px] text-ink-soft">
        Moving an application to a new stage records it on the applicant&rsquo;s
        timeline immediately.
      </p>

      <section className="mb-10 rounded-2xl border border-line bg-white p-6">
        <h2 className="mb-4 text-[18px] font-semibold">Open a new application</h2>
        <ActionForm action={createApplication} submitLabel="Create application">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <FieldLabel htmlFor="new-fullName">Applicant name</FieldLabel>
              <input id="new-fullName" name="fullName" required className={inputCls} placeholder="Priya Sharma" />
            </div>
            <div>
              <FieldLabel htmlFor="new-email">Applicant email</FieldLabel>
              <input id="new-email" name="email" type="email" required className={inputCls} placeholder="priya@email.com" />
            </div>
            <div>
              <FieldLabel htmlFor="new-intake">Intake</FieldLabel>
              <input id="new-intake" name="intake" className={inputCls} placeholder={currentIntake()} />
            </div>
            <div>
              <FieldLabel htmlFor="new-university">University</FieldLabel>
              <input id="new-university" name="universityName" required className={inputCls} placeholder="University of Warwick" />
            </div>
            <div>
              <FieldLabel htmlFor="new-programme">Programme</FieldLabel>
              <input id="new-programme" name="programmeName" required className={inputCls} placeholder="MSc Business Analytics" />
            </div>
            <div>
              <FieldLabel htmlFor="new-hub">Subject hub</FieldLabel>
              <select id="new-hub" name="courseHubId" defaultValue="" className={inputCls}>
                <option value="">None</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
          </div>
        </ActionForm>
      </section>

      {applications.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-ui text-ink-soft">
          No applications yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {applications.map((app) => (
            <li key={app.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <span className="font-mono text-mini uppercase tracking-[0.1em] text-ink-soft">
                    {app.reference}
                  </span>
                  <h2 className="text-[17px] font-semibold">{app.programmeName}</h2>
                  <p className="text-body text-ink-soft">
                    {app.universityName} · {app.applicant.fullName ?? app.applicant.email}
                  </p>
                </div>
                <span className="rounded-pill bg-ink px-3 py-1.5 font-mono text-mini uppercase tracking-wider text-paper">
                  {stageLabel(app.stage)}
                </span>
              </div>

              <ActionForm action={updateApplicationStage} submitLabel="Update stage">
                <input type="hidden" name="applicationId" value={app.id} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <FieldLabel htmlFor={`stage-${app.id}`}>Stage</FieldLabel>
                    <select id={`stage-${app.id}`} name="stage" defaultValue={app.stage} className={inputCls}>
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel htmlFor={`note-${app.id}`}>
                      Timeline note
                    </FieldLabel>
                    <input id={`note-${app.id}`} name="note" className={inputCls} placeholder="Offer letter received" />
                  </div>
                  <div>
                    <FieldLabel htmlFor={`anote-${app.id}`}>
                      Note to applicant
                    </FieldLabel>
                    <input
                      id={`anote-${app.id}`}
                      name="applicantNote"
                      defaultValue={app.applicantNote ?? ""}
                      className={inputCls}
                      placeholder="Send your transcripts by Friday"
                    />
                  </div>
                </div>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
