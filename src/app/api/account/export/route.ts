import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/supabase/server";
import { collectPersonalData } from "@/lib/rights/collect";
import { requestMetadata } from "@/lib/consent/record";
import { logAccess } from "@/lib/audit";

/**
 * Right to access, s.11 — the download itself.
 *
 * A route handler rather than a server action because the response is a file:
 * the person gets the bytes directly, with no copy staged on a server for
 * someone else to find later.
 *
 * Every hit writes a `data_export_requests` row. That row is the audit trail
 * for "who took a copy of this data and when", which matters as much for a
 * stolen session as it does for the person's own record.
 */

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

/** RFC 4180: quote everything, double any embedded quote. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * One CSV per section, concatenated with a header line between them.
 *
 * The bundle is nested and CSV is not, so something has to give. A single
 * flattened sheet would need a column for every field of every section and
 * would be mostly empty; sections keep each block readable in a spreadsheet.
 */
function toCsv(bundle: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [section, value] of Object.entries(bundle)) {
    if (value === null || value === undefined) continue;

    const rows: Row[] = Array.isArray(value)
      ? (value as Row[])
      : typeof value === "object"
        ? [value as Row]
        : [{ value }];
    if (rows.length === 0) continue;

    lines.push(`# ${section}`);

    // Union of keys: rows in a section can differ (an optional note, say),
    // and keying off the first row alone would silently drop those columns.
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    lines.push(columns.map(csvCell).join(","));
    for (const row of rows) {
      lines.push(columns.map((col) => csvCell(row[col])).join(","));
    }
    lines.push("");
  }

  return lines.join("\r\n");
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const email = user.email.toLowerCase();
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";

  let bundle: Awaited<ReturnType<typeof collectPersonalData>>;
  try {
    bundle = await collectPersonalData(email);
  } catch (error) {
    console.error("[export] failed to assemble bundle", error);
    return NextResponse.json(
      { error: "We couldn't build your export just now. Try again shortly." },
      { status: 500 },
    );
  }

  // Logged after the bundle is built, so a failed export is not recorded as a
  // fulfilled one — but before the response is returned, so a successful
  // download is never missing from the trail.
  try {
    const { ipAddress } = await requestMetadata();
    await db.insert(schema.dataExportRequests).values({
      subjectEmail: email,
      authUserId: user.id,
      format,
      status: "completed",
      fulfilledAt: new Date(),
      ipAddress,
    });
  } catch (error) {
    console.error("[export] failed to log export request", error);
  }

  // Logged in the audit trail as well as the rights ledger. The two answer
  // different questions: `data_export_requests` is "did we honour s.11",
  // `access_logs` is "who read this person's data" — and after a stolen
  // session the second is the one that matters.
  await logAccess({
    actorType: "data_principal",
    actorId: user.id,
    actorEmail: email,
    action: "export",
    resourceType: "personal_data_bundle",
    subjectEmail: email,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `gradmire-my-data-${stamp}.${format}`;
  const body =
    format === "csv"
      ? toCsv(bundle as unknown as Record<string, unknown>)
      : JSON.stringify(bundle, null, 2);

  return new NextResponse(body, {
    headers: {
      "Content-Type":
        format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // A file of somebody's entire personal record has no business in a
      // shared cache, a CDN, or the browser's back-forward cache.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
