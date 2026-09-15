import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { ActionForm, FieldLabel } from "@/components/admin/action-form";
import { updateCourseHub } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Course content" };

const inputCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-body";

export default async function AdminCoursesPage() {
  // Published course content is business-wide, not one counselor's caseload.
  await requireAdmin();

  const hubs = await db.query.courseHubs.findMany({
    orderBy: [asc(schema.courseHubs.sortOrder)],
    with: { universities: { columns: { id: true } } },
    // Well above the current row count; here so the page cannot silently
    // become a full-table scan as content grows.
    limit: 200,
  });

  return (
    <>
      <h1 className="mb-2 text-[30px] font-semibold">Course content</h1>
      <p className="mb-8 max-w-[70ch] text-[14.5px] text-ink-soft">
        Figures here are what the public hub pages render. Saving clears the content
        cache, so edits appear on the live site on the next request. Tick{" "}
        <strong className="font-medium text-ink">Mark verified</strong> once you have
        checked a hub&rsquo;s rankings and fees against the current subject tables.
      </p>

      <ul className="space-y-5">
        {hubs.map((hub) => (
          <li key={hub.id} className="rounded-2xl border border-line bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-mini uppercase tracking-[0.1em] text-sky-text">
                  {hub.code}
                </span>
                <h2 className="text-[18px] font-semibold">{hub.name}</h2>
                <p className="text-meta text-ink-soft">
                  {hub.universities.length} universities ·{" "}
                  {hub.dataVerifiedAt
                    ? `verified ${hub.dataVerifiedAt.toLocaleDateString("en-GB")}`
                    : "figures not yet verified"}
                </p>
              </div>
              {!hub.dataVerifiedAt && hub.status === "live" && (
                <span className="rounded-pill bg-sky-dim px-3 py-1.5 font-mono text-mini uppercase tracking-wider text-sky-text">
                  Unverified
                </span>
              )}
            </div>

            <ActionForm action={updateCourseHub} submitLabel="Save hub">
              <input type="hidden" name="hubId" value={hub.id} />
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <FieldLabel htmlFor={`status-${hub.id}`}>Status</FieldLabel>
                    <select id={`status-${hub.id}`} name="status" defaultValue={hub.status} className={inputCls}>
                      <option value="live">Live</option>
                      <option value="stub">Stub (hidden)</option>
                    </select>
                  </div>
                  {([
                    ["tuitionMin", "Tuition min", hub.tuitionMin],
                    ["tuitionMax", "Tuition max", hub.tuitionMax],
                    ["livingCostMin", "Living min /mo", hub.livingCostMin],
                    ["livingCostMax", "Living max /mo", hub.livingCostMax],
                    ["salaryMin", "Salary min", hub.salaryMin],
                    ["salaryMax", "Salary max", hub.salaryMax],
                  ] as const).map(([name, label, value]) => (
                    <div key={name}>
                      <FieldLabel htmlFor={`${name}-${hub.id}`}>
                        {label}
                      </FieldLabel>
                      <input
                        id={`${name}-${hub.id}`}
                        name={name}
                        inputMode="numeric"
                        defaultValue={value ?? ""}
                        className={inputCls}
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <FieldLabel htmlFor={`oneLiner-${hub.id}`}>
                    One-liner
                  </FieldLabel>
                  <textarea
                    id={`oneLiner-${hub.id}`}
                    name="oneLiner"
                    rows={2}
                    defaultValue={hub.oneLiner ?? ""}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor={`overview-${hub.id}`}>
                    Overview
                  </FieldLabel>
                  <textarea
                    id={`overview-${hub.id}`}
                    name="overview"
                    rows={3}
                    defaultValue={hub.overview ?? ""}
                    className={inputCls}
                  />
                </div>

                <label className="flex items-center gap-2.5 text-[13px]">
                  <input type="checkbox" name="markVerified" className="h-4 w-4 rounded border-line" />
                  Mark figures as verified today
                </label>
              </div>
            </ActionForm>
          </li>
        ))}
      </ul>
    </>
  );
}
