import { describe, expect, it } from "vitest";
import { isAdmin, mayActOn, scopeToStaff, type StaffMember } from "./auth";
import { schema } from "@/db";

/**
 * Least privilege (DPDP s.8(4)).
 *
 * The `counselor` / `admin` distinction sat unread in the schema for the
 * life of the project, so every counselor could read every lead. These are
 * the cases that decide whether that is actually fixed — in particular the
 * write-side check, because hiding a row from a list does nothing if posting
 * its id still works.
 */

const counselor: StaffMember = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "counselor@gradmire.com",
  fullName: "A Counselor",
  role: "counselor",
  specialization: null,
  createdAt: new Date(),
};

const admin: StaffMember = { ...counselor, id: "22222222-2222-2222-2222-222222222222", role: "admin" };

const asCounselor = { staff: counselor, isAdmin: false };
const asAdmin = { staff: admin, isAdmin: true };

describe("isAdmin", () => {
  it("reads the role rather than assuming staff means admin", () => {
    expect(isAdmin(counselor)).toBe(false);
    expect(isAdmin(admin)).toBe(true);
  });
});

describe("scopeToStaff", () => {
  it("returns undefined for an admin, which Drizzle treats as no filter", () => {
    expect(scopeToStaff(asAdmin, schema.leads.assignedStaffId)).toBeUndefined();
    expect(
      scopeToStaff(asAdmin, schema.leads.assignedStaffId, { includeUnassigned: true }),
    ).toBeUndefined();
  });

  it("returns a filter for a counselor", () => {
    expect(scopeToStaff(asCounselor, schema.leads.assignedStaffId)).toBeDefined();
    expect(
      scopeToStaff(asCounselor, schema.applications.assignedStaffId, {
        includeUnassigned: true,
      }),
    ).toBeDefined();
  });
});

describe("mayActOn", () => {
  it("lets an admin act on anything, including another counselor's row", () => {
    expect(mayActOn(asAdmin, "99999999-9999-9999-9999-999999999999")).toBe(true);
    expect(mayActOn(asAdmin, null)).toBe(true);
  });

  it("lets a counselor act on their own row", () => {
    expect(mayActOn(asCounselor, counselor.id)).toBe(true);
  });

  it("refuses a counselor another counselor's row", () => {
    // The list already hides this row. This is the check that stops the id
    // still working when it is posted directly.
    expect(mayActOn(asCounselor, "99999999-9999-9999-9999-999999999999")).toBe(false);
  });

  it("refuses an unassigned row unless the caller opts in", () => {
    // Unassigned is the shared intake pool: claimable from the leads list,
    // but not silently actionable everywhere by default.
    expect(mayActOn(asCounselor, null)).toBe(false);
    expect(mayActOn(asCounselor, null, { allowUnassigned: true })).toBe(true);
  });
});
