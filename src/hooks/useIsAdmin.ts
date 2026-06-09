import { useCurrentUser } from "./useCurrentUser";
import { useAdmins } from "./useAdmins";
import { isAdminEmail } from "@/lib/adminAccess";

/**
 * Returns true if the signed-in user is authorised to use the admin UI.
 * Reads from the Admins SharePoint list (managed at /admin/admins) with
 * the bootstrap set as a fallback. The actual predicate (bootstrap set +
 * list membership) lives in `@/lib/adminAccess` so the admin/user-list
 * mutation guards can share it.
 */
export function useIsAdmin(): boolean {
  const user = useCurrentUser();
  const { data: admins = [] } = useAdmins();
  return isAdminEmail(user.email, admins);
}
