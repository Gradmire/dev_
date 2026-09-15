import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageHref, type PageInfo } from "@/lib/pagination";

/**
 * Pagination controls for the admin lists.
 *
 * The range and total shown are the *scoped* total — what this staff member
 * may see, not what the table holds. A counselor reading "1–25 of 400" when
 * only 30 of those are theirs would be a quieter version of the leak the
 * scoping exists to prevent.
 */
export function Pager({
  info,
  basePath,
  searchParams,
  label,
}: {
  info: PageInfo;
  basePath: string;
  searchParams?: Record<string, string | string[] | undefined>;
  label: string;
}) {
  if (info.total === 0) return null;

  const linkCls =
    "inline-flex items-center gap-1 rounded-pill border border-line bg-white px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-ink";
  const disabledCls =
    "inline-flex items-center gap-1 rounded-pill border border-line px-3.5 py-2 text-[13px] font-medium text-ink-soft/50";

  return (
    <nav
      aria-label={`${label} pagination`}
      className="mt-6 flex flex-wrap items-center justify-between gap-3"
    >
      <p aria-live="polite" className="font-mono text-mini uppercase tracking-[0.08em] text-ink-soft">
        {info.from}–{info.to} of {info.total} {label}
        {info.totalPages > 1 && ` · page ${info.page} of ${info.totalPages}`}
      </p>

      {info.totalPages > 1 && (
        <div className="flex items-center gap-2">
          {info.hasPrev ? (
            <Link
              href={pageHref(basePath, searchParams, info.page - 1, info.key)}
              rel="prev"
              className={linkCls}
            >
              <ChevronLeft size={14} aria-hidden="true" />
              Previous
            </Link>
          ) : (
            <span className={disabledCls} aria-hidden="true">
              <ChevronLeft size={14} />
              Previous
            </span>
          )}

          {info.hasNext ? (
            <Link
              href={pageHref(basePath, searchParams, info.page + 1, info.key)}
              rel="next"
              className={linkCls}
            >
              Next
              <ChevronRight size={14} aria-hidden="true" />
            </Link>
          ) : (
            <span className={disabledCls} aria-hidden="true">
              Next
              <ChevronRight size={14} />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
