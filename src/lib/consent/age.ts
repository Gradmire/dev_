/**
 * Age determination for the children's-data provisions (DPDP s.9, Rule 10).
 *
 * Deliberately conservative in one respect: a missing date of birth is
 * `"unknown"`, never `"adult"`. Every applicant created before this field
 * existed, and every one a counselor opens by hand from a phone call, has no
 * date of birth on file — treating those as adults would quietly exempt the
 * whole back catalogue from the protection the section exists to give.
 */

export const MINOR_AGE_THRESHOLD = 18;

export type AgeBand = "adult" | "minor" | "unknown";

/** Whole years old on `at`, or null if the date of birth is missing/unparseable. */
export function ageOn(
  dateOfBirth: string | Date | null | undefined,
  at: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null;

  const dob =
    dateOfBirth instanceof Date ? dateOfBirth : new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;
  if (dob > at) return null;

  let age = at.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - dob.getUTCMonth();
  // Birthday not yet reached this year.
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age;
}

/**
 * Which side of 18 someone is on *right now*.
 *
 * Computed rather than stored, because the answer changes on a birthday. A
 * denormalised `is_minor` column would be wrong for every applicant who turns
 * 18 while their application is open, and nothing would ever correct it.
 */
export function ageBand(
  dateOfBirth: string | Date | null | undefined,
  at: Date = new Date(),
): AgeBand {
  const age = ageOn(dateOfBirth, at);
  if (age === null) return "unknown";
  return age < MINOR_AGE_THRESHOLD ? "minor" : "adult";
}

export function isMinor(
  dateOfBirth: string | Date | null | undefined,
  at: Date = new Date(),
): boolean {
  return ageBand(dateOfBirth, at) === "minor";
}

/** The date of birth of someone turning 18 today — the oldest DOB still a minor. */
export function minorCutoffDate(at: Date = new Date()): string {
  const d = new Date(at);
  d.setUTCFullYear(d.getUTCFullYear() - MINOR_AGE_THRESHOLD);
  return d.toISOString().slice(0, 10);
}

/**
 * Bounds for the date input. 100 years covers any real applicant; the upper
 * bound stops a typo in the year landing in the future, which `ageOn` would
 * otherwise have to treat as unknown.
 */
export function dateOfBirthBounds(at: Date = new Date()): { min: string; max: string } {
  const min = new Date(at);
  min.setUTCFullYear(min.getUTCFullYear() - 100);
  return { min: min.toISOString().slice(0, 10), max: at.toISOString().slice(0, 10) };
}
