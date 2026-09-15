import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Service-role client. Bypasses row-level security entirely, so it is
 * confined to the one operation that genuinely cannot be done as the user:
 * deleting their own auth record during erasure.
 *
 * Returns null when the key is absent rather than throwing. An erasure must
 * still run — and must still report honestly that the auth record could not
 * be removed — on a deploy that has not been given the key.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) return null;

  return createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Deletes the Supabase auth user behind an email address.
 *
 * Reports what happened rather than throwing: a failure here must not roll
 * back the database erasure that has already succeeded, or the person ends
 * up with their data intact and a completed-looking request.
 */
export async function deleteAuthUserByEmail(
  email: string,
): Promise<{ deleted: boolean; reason?: "not_configured" | "not_found" | "error" }> {
  const admin = createAdminClient();
  if (!admin) return { deleted: false, reason: "not_configured" };

  try {
    // There is no lookup-by-email endpoint; the list is paged and filtered.
    // Volumes here are small, and this runs once per erasure request.
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[erasure] listUsers failed", error.message);
        return { deleted: false, reason: "error" };
      }

      const match = data.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (match) {
        const { error: delError } = await admin.auth.admin.deleteUser(match.id);
        if (delError) {
          console.error("[erasure] deleteUser failed", delError.message);
          return { deleted: false, reason: "error" };
        }
        return { deleted: true };
      }

      if (data.users.length < perPage) return { deleted: false, reason: "not_found" };
      page++;
    }
  } catch (error) {
    console.error("[erasure] auth deletion threw", error);
    return { deleted: false, reason: "error" };
  }
}
