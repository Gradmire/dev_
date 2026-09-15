/**
 * Offset pagination for the admin lists.
 *
 * Offset rather than cursor, deliberately. Cursor pagination wins on large
 * tables and on feeds that shift under the reader, and loses on everything
 * else — it cannot jump to a page, cannot show a total, and needs the sort
 * key threaded through every link. These lists are a counselor's own
 * caseload, sorted by a date, and the brief is explicit that the totals have
 * to stay honest. Offset gives that for a `limit`/`offset` pair that drops
 * into the existing query beside `scopeToStaff` without either knowing about
 * the other.
 *
 * Revisit if a single counselor's list passes a few thousand rows, where
 * OFFSET starts making Postgres walk rows it will discard.
 */

export const DEFAULT_PAGE_SIZE = 25;

export type Page = {
  page: number;
  pageSize: number;
  offset: number;
  /** The query parameter this page was read from, so links round-trip. */
  key: string;
};

/**
 * Reads `?page=` into a 1-based page number.
 *
 * Anything unparseable, zero, negative or fractional becomes page 1 rather
 * than an error: a bad page number in a URL is not worth a 500, and a
 * negative offset is a database error rather than an empty list.
 */
export function readPage(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  {
    pageSize = DEFAULT_PAGE_SIZE,
    key = "page",
  }: { pageSize?: number; key?: string } = {},
): Page {
  const raw = searchParams?.[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number.parseInt(value ?? "1", 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  return { page, pageSize, offset: (page - 1) * pageSize, key };
}

export type PageInfo = Page & {
  total: number;
  totalPages: number;
  from: number;
  to: number;
  hasPrev: boolean;
  hasNext: boolean;
};

/** Combines the requested page with the scoped total the query reported. */
export function pageInfo(page: Page, total: number): PageInfo {
  const totalPages = Math.max(1, Math.ceil(total / page.pageSize));
  const from = total === 0 ? 0 : page.offset + 1;
  const to = Math.min(page.offset + page.pageSize, total);
  return {
    ...page,
    total,
    totalPages,
    from,
    to,
    hasPrev: page.page > 1,
    hasNext: page.page < totalPages,
  };
}

/** Preserves any other query parameters when building a page link. */
export function pageHref(
  basePath: string,
  searchParams: Record<string, string | string[] | undefined> | undefined,
  page: number,
  key = "page",
): string {
  const params = new URLSearchParams();
  // Every other parameter is carried through, which is what lets two lists
  // on one page (the consent ledger and the access trail) page
  // independently without either resetting the other.
  for (const [k, value] of Object.entries(searchParams ?? {})) {
    if (k === key || value === undefined) continue;
    params.set(k, Array.isArray(value) ? (value[0] ?? "") : value);
  }
  if (page > 1) params.set(key, String(page));
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
