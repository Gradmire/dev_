import Link from "next/link";
import { desc, eq, count, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireStaff, scopeToStaff } from "@/lib/auth";
import { logStaffAccess } from "@/lib/audit";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const context = await requireStaff();

  // The tiles are scoped as well as the lists. A count is a small leak, but
  // it is still a leak: "how many enquiries came in this week" is not a
  // counselor's to know if the enquiries themselves are not theirs to read.
  const leadScope = scopeToStaff(context, schema.leads.assignedStaffId, {
    includeUnassigned: true,
  });
  const appScope = scopeToStaff(context, schema.applications.assignedStaffId, {
    includeUnassigned: true,
  });

  const [newLeads, openApplications, liveHubs, staleHubs, recentLeads] =
    await Promise.all([
      db
        .select({ n: count() })
        .from(schema.leads)
        .where(and(eq(schema.leads.status, "new"), leadScope)),
      db.select({ n: count() }).from(schema.applications).where(appScope),
      db
        .select({ n: count() })
        .from(schema.courseHubs)
        .where(eq(schema.courseHubs.status, "live")),
      db.query.courseHubs.findMany({
        where: eq(schema.courseHubs.status, "live"),
        columns: { id: true, name: true, dataVerifiedAt: true },
        limit: 200,
      }),
      db.query.leads.findMany({
        where: leadScope,
        orderBy: [desc(schema.leads.createdAt)],
        limit: 8,
      }),
    ]);

  await logStaffAccess(context, {
    action: "list",
    resourceType: "leads",
    rowCount: recentLeads.length,
  });

  const unverified = staleHubs.filter((h) => !h.dataVerifiedAt);

  const tiles = [
    { label: "New leads", value: newLeads[0]?.n ?? 0, href: "/admin/leads" },
    { label: "Applications", value: openApplications[0]?.n ?? 0, href: "/admin/applications" },
    { label: "Live course hubs", value: liveHubs[0]?.n ?? 0, href: "/admin/courses" },
    { label: "Hubs with unverified data", value: unverified.length, href: "/admin/courses" },
  ];

  return (
    <>
      <h1 className="mb-8 text-[30px] font-semibold">Overview</h1>

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-2xl border border-line bg-white p-5 transition-colors hover:border-ink"
          >
            <span className="block font-mono text-mini uppercase tracking-[0.08em] text-ink-soft">
              {t.label}
            </span>
            <span className="mt-2 block font-display text-[32px] font-semibold tabular">
              {t.value}
            </span>
          </Link>
        ))}
      </div>

      {unverified.length > 0 && (
        <div className="mb-10 rounded-2xl border-l-[3px] border-sky bg-sky-dim px-5 py-4">
          <h2 className="mb-1 text-lede font-semibold">
            {unverified.length} live {unverified.length === 1 ? "hub carries" : "hubs carry"} unverified figures
          </h2>
          <p className="text-body text-ink-soft">
            Rankings and fees were seeded as placeholders. Verify them against the
            current subject tables, then mark them verified in Course content:{" "}
            {unverified.map((h) => h.name).join(", ")}.
          </p>
        </div>
      )}

      <h2 className="mb-4 text-[20px] font-semibold">Latest enquiries</h2>
      {recentLeads.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-ui text-ink-soft">
          No consultation requests yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Name", "Email", "Intake", "Received", "Status"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-left font-mono text-mini font-medium uppercase tracking-[0.08em] text-ink-soft">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLeads.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{l.fullName}</td>
                  <td className="px-4 py-3 text-ink-soft">{l.email}</td>
                  <td className="px-4 py-3 text-ink-soft">{l.preferredIntake ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-meta text-ink-soft">
                    {l.createdAt.toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-pill bg-paper-dim px-2.5 py-1 font-mono text-mini uppercase">
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
