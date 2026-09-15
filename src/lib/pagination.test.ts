import { describe, expect, it } from "vitest";
import { readPage, pageInfo, pageHref, DEFAULT_PAGE_SIZE } from "./pagination";

/**
 * The page number arrives in a URL, so every malformed value a person can
 * type is an input to this. A negative page is the one that matters: it
 * becomes a negative OFFSET, which Postgres rejects outright — a 500 on an
 * admin list because someone edited the address bar.
 */

describe("readPage", () => {
  it("defaults to page 1 when absent", () => {
    expect(readPage(undefined)).toMatchObject({ page: 1, offset: 0 });
    expect(readPage({})).toMatchObject({ page: 1, offset: 0 });
  });

  it("computes offset from the page size", () => {
    expect(readPage({ page: "3" }, { pageSize: 25 })).toMatchObject({
      page: 3,
      offset: 50,
    });
  });

  it("falls back to page 1 for anything unusable", () => {
    for (const bad of ["0", "-4", "abc", "", "NaN", "1.5e400"]) {
      expect(readPage({ page: bad }).page).toBe(1);
      expect(readPage({ page: bad }).offset).toBe(0);
    }
  });

  it("takes the first value when a param is repeated", () => {
    expect(readPage({ page: ["2", "9"] }).page).toBe(2);
  });

  it("reads a named key so two lists can page independently", () => {
    const params = { consent: "2", access: "5" };
    expect(readPage(params, { key: "consent", pageSize: 40 }).offset).toBe(40);
    expect(readPage(params, { key: "access", pageSize: 50 }).offset).toBe(200);
  });
});

describe("pageInfo", () => {
  it("describes a middle page", () => {
    const info = pageInfo(readPage({ page: "2" }, { pageSize: 25 }), 60);
    expect(info).toMatchObject({
      from: 26,
      to: 50,
      totalPages: 3,
      hasPrev: true,
      hasNext: true,
    });
  });

  it("clamps the end of the last page to the total", () => {
    const info = pageInfo(readPage({ page: "3" }, { pageSize: 25 }), 60);
    expect(info).toMatchObject({ from: 51, to: 60, hasNext: false });
  });

  it("reports an empty set as 0 of 0 rather than 1 of 0", () => {
    const info = pageInfo(readPage({}), 0);
    expect(info).toMatchObject({ from: 0, to: 0, totalPages: 1, hasNext: false });
  });

  it("uses the default page size when none is given", () => {
    expect(pageInfo(readPage({}), 100).to).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("pageHref", () => {
  it("omits the parameter entirely for page 1", () => {
    expect(pageHref("/admin/leads", {}, 1)).toBe("/admin/leads");
  });

  it("preserves unrelated parameters", () => {
    // The two ledgers on /admin/privacy page independently, which only works
    // if each link carries the other's position through untouched.
    const href = pageHref("/admin/privacy", { consent: "2", access: "3" }, 4, "access");
    expect(href).toContain("consent=2");
    expect(href).toContain("access=4");
  });

  it("drops its own key when returning to page 1", () => {
    const href = pageHref("/admin/privacy", { consent: "2", access: "3" }, 1, "access");
    expect(href).toContain("consent=2");
    expect(href).not.toContain("access=");
  });
});
