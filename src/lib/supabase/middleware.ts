import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Refreshes the Supabase session on every request and gates the two authed
 * areas. Applicants may only reach /portal; staff may only reach /admin.
 * Admin membership is checked against the `staff` table via the user's
 * app_metadata role claim, which is set when a staff row is created.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // Without Supabase there is no way to authenticate anyone, so the gated
  // areas must stay shut. Everything else — the whole public site — is
  // served normally rather than 500-ing on a missing env var.
  if (!isSupabaseConfigured()) {
    if (
      pathname.startsWith("/portal") ||
      pathname.startsWith("/account") ||
      pathname.startsWith("/admin")
    ) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/login";
      redirect.search = "?error=auth_unavailable";
      return NextResponse.redirect(redirect);
    }
    return response;
  }

  const supabase = createServerClient(
    SUPABASE_URL!,
    SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser — a dropped
  // session refresh here logs users out at random.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The account area carries the data-principal rights surfaces, so it is
  // gated exactly as the portal is: everything there acts on the signed-in
  // person's own data.
  const isPortal = pathname.startsWith("/portal") || pathname.startsWith("/account");
  const isAdmin = pathname.startsWith("/admin");
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/auth");

  if ((isPortal || isAdmin) && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  if (isAdmin && user) {
    const role = (user.app_metadata as { gradmire_role?: string })?.gradmire_role;
    if (role !== "counselor" && role !== "admin") {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/portal";
      return NextResponse.redirect(redirect);
    }
  }

  if (isAuthRoute && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/portal";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}
