import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { purgeExpiredData } from "@/lib/retention";

/**
 * Scheduled retention purge (DPDP s.8(7)). Wired to a Vercel cron in
 * vercel.json; also callable by hand with the same secret.
 *
 * `?dryRun=1` reports what would be removed without removing it. Run that
 * first after any change to the retention periods — the first execution of a
 * delete job against live personal data should be a report, not an act of
 * faith.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Constant-time comparison. A plain `!==` on a secret leaks its length and,
 * across enough requests, its content — and this endpoint deletes things.
 */
function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`, "utf8");
  const received = Buffer.from(header, "utf8");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    // No detail. An unauthenticated caller learns only that it was refused.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const report = await purgeExpiredData({ dryRun });
    console.log("[retention]", JSON.stringify(report));
    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[retention] purge failed", error);
    return NextResponse.json({ error: "Purge failed" }, { status: 500 });
  }
}
