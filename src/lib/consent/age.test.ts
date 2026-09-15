import { describe, expect, it } from "vitest";
import { ageBand, ageOn, isMinor, minorCutoffDate, dateOfBirthBounds } from "./age";

/**
 * This decides who gets the children's-data protections (DPDP s.9), so the
 * cases that matter are the boundary ones — the day before an 18th birthday,
 * the day of it, and every way a date of birth can be missing.
 */

const NOW = new Date("2026-09-15T12:00:00Z");

describe("ageOn", () => {
  it("counts whole years", () => {
    expect(ageOn("2000-09-15", NOW)).toBe(26);
    expect(ageOn("2008-01-01", NOW)).toBe(18);
  });

  it("does not round up before the birthday", () => {
    // Turns 18 tomorrow. Still 17 today, and still a child today.
    expect(ageOn("2008-09-16", NOW)).toBe(17);
    // Turns 18 today.
    expect(ageOn("2008-09-15", NOW)).toBe(18);
  });

  it("returns null when there is no usable date", () => {
    expect(ageOn(null, NOW)).toBeNull();
    expect(ageOn(undefined, NOW)).toBeNull();
    expect(ageOn("", NOW)).toBeNull();
    expect(ageOn("not-a-date", NOW)).toBeNull();
  });

  it("returns null for a date in the future rather than a negative age", () => {
    expect(ageOn("2030-01-01", NOW)).toBeNull();
  });
});

describe("ageBand", () => {
  it("splits on the 18th birthday", () => {
    expect(ageBand("2008-09-16", NOW)).toBe("minor");
    expect(ageBand("2008-09-15", NOW)).toBe("adult");
  });

  it("treats a missing date of birth as unknown, never as adult", () => {
    // The whole back catalogue of applicants predates this field. Scoring
    // them as adults would silently exempt every one of them from s.9.
    expect(ageBand(null, NOW)).toBe("unknown");
    expect(ageBand("", NOW)).toBe("unknown");
  });

  it("accepts a Date as well as an ISO string", () => {
    expect(ageBand(new Date("2010-01-01T00:00:00Z"), NOW)).toBe("minor");
  });
});

describe("isMinor", () => {
  it("is false for unknown ages, so callers must check the band themselves", () => {
    // isMinor answers "do we know they are a child", not "are they an adult".
    // The gate in consent/parental.ts handles `unknown` as its own case.
    expect(isMinor(null, NOW)).toBe(false);
    expect(isMinor("2010-01-01", NOW)).toBe(true);
  });
});

describe("minorCutoffDate", () => {
  it("is the date of birth of someone turning 18 today", () => {
    expect(minorCutoffDate(NOW)).toBe("2008-09-15");
    expect(ageBand(minorCutoffDate(NOW), NOW)).toBe("adult");
  });
});

describe("dateOfBirthBounds", () => {
  it("bounds the picker so a typo cannot land in the future", () => {
    const { min, max } = dateOfBirthBounds(NOW);
    expect(max).toBe("2026-09-15");
    expect(min).toBe("1926-09-15");
    // A future date would score as "unknown" — the one band that skips the gate.
    expect(ageBand(max, NOW)).toBe("minor");
  });
});
