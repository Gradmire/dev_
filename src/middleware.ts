import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  /*
   * Only the gated areas and the auth routes. `updateSession` is a no-op on
   * every other path, so running it site-wide bought nothing and cost every
   * public page an edge invocation — which also stopped fully static pages
   * being served straight from the CDN.
   */
  matcher: [
    "/portal/:path*",
    "/account/:path*",
    "/admin/:path*",
    "/login/:path*",
    "/signup/:path*",
    "/auth/:path*",
  ],
};
