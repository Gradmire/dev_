import "server-only";
import { redirect } from "next/navigation";
import { eq, or, isNull, type SQL } from "drizzle-orm";
import { getSessionUser } from "@/lib/supabase/server";
import { db, schema } from "@/db";

export type StaffMember = typeof schema.staff.$inferSelect;

/**
 * Who is allowed to see other people's caseloads.
 *
 * The `counselor` / `admin` distinction existed in the schema from the start
 * and nothing in the code had ever read it, so every counselor could read
 * every lead, every applicant and every counselor note on the site. That is
 * the s.8(4) problem in its plainest form: the safeguard was declared and
 * never enforced.
 */
export function isAdmin(member: StaffMember): boolean {
  return member.role === "admin";
}

/**
 * Guards every admin surface. Middleware already blocks the route by role
 * claim; this re-checks against the staff table so a stale JWT claim cannot
 * grant access on its own.
 */
export async function requireStaff() {
  const user = await getSessionUser();
  if (!user?.email) redirect("/login?next=/admin");

  const member = await db.query.staff.findFirst({
    where: eq(schema.staff.email, user.email.toLowerCase()),
  });

  if (!member) redirect("/portal");
  return { user, staff: member, isAdmin: isAdmin(member) };
}

/**
 * Guards the surfaces a counselor has no business on: other counselors'
 * caseloads, bulk exports, and the consent ledger.
 *
 * Sends a counselor to /admin rather than /portal — they are legitimately
 * staff, just not for this page, and bouncing them out of the admin area
 * entirely would read as a broken session rather than a boundary.
 */
export async function requireAdmin() {
  const context = await requireStaff();
  if (!context.isAdmin) redirect("/admin?error=admin_only");
  return context;
}

/**
 * Narrows a query to what one staff member may see.
 *
 * Returns `undefined` for an admin, which every Drizzle `where` treats as no
 * filter — so the caller writes one query and the scoping is decided here
 * rather than duplicated as an `if (isAdmin)` at each call site, where the
 * one that gets forgotten is the leak.
 *
 * `includeUnassigned` covers the intake pool. A brand new enquiry has no
 * assignee, so scoping it strictly by assignment would make it invisible to
 * everyone except an admin — and an enquiry nobody can see is an enquiry
 * nobody answers, which is a worse outcome for the person who sent it than
 * the narrow over-exposure of it sitting in a shared queue until claimed.
 * Once a lead is claimed it leaves every other counselor's view.
 */
export function scopeToStaff(
  context: { staff: StaffMember; isAdmin: boolean },
  column: typeof schema.leads.assignedStaffId | typeof schema.applications.assignedStaffId,
  { includeUnassigned = false }: { includeUnassigned?: boolean } = {},
): SQL | undefined {
  if (context.isAdmin) return undefined;
  return includeUnassigned
    ? or(eq(column, context.staff.id), isNull(column))
    : eq(column, context.staff.id);
}

/**
 * Whether this staff member may act on a specific record.
 *
 * Read scoping hides a row; this is the write-side check, for the actions
 * that take an id straight from a form. Hiding a row in a list does nothing
 * if POSTing its id still works.
 */
export function mayActOn(
  context: { staff: StaffMember; isAdmin: boolean },
  assignedStaffId: string | null,
  { allowUnassigned = false }: { allowUnassigned?: boolean } = {},
): boolean {
  if (context.isAdmin) return true;
  if (assignedStaffId === null) return allowUnassigned;
  return assignedStaffId === context.staff.id;
}

/**
 * Guards the account area.
 *
 * Returns the applicant row as well as the auth user, because every right in
 * this area acts on the person's own data and the email on the session is
 * what links the two. An `applicant` of null is a signed-in user who has no
 * record yet — they can still exercise their rights (there may be a lead or a
 * newsletter row under the same address), so this is not an error.
 */
export async function requireAccount() {
  const user = await getSessionUser();
  if (!user?.email) redirect("/login?next=/account");

  const email = user.email.toLowerCase();
  const applicant = await db.query.applicants.findFirst({
    where: eq(schema.applicants.email, email),
  });

  return { user, email, applicant: applicant ?? null };
}
