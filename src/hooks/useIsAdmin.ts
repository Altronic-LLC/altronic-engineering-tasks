import { useCurrentUser } from "./useCurrentUser";
import { useAdmins } from "./useAdmins";

/**
 * Bootstrap admin set. These accounts are admins even if the Admins
 * SharePoint list is empty or unavailable — that way nobody can lock
 * themselves out by accidentally removing every entry. The list is the
 * authoritative source going forward; this set just guarantees there's
 * always a path back in.
 *
 * In mock mode, the demo user is on this list so the admin UI is
 * exercisable in the demo.
 */
const BOOTSTRAP_ADMINS = new Set<string>([
  "ray.white@altronic-llc.com",
  "demo.user@altronic-llc.com",
]);

/**
 * Returns true if the signed-in user is authorised to use the admin UI.
 * Reads from the Admins SharePoint list (managed at /admin/admins) with
 * the bootstrap set as a fallback.
 */
export function useIsAdmin(): boolean {
  const user = useCurrentUser();
  const { data: admins = [] } = useAdmins();
  if (!user.email) return false;
  const email = user.email.toLowerCase();
  if (BOOTSTRAP_ADMINS.has(email)) return true;
  return admins.some((a) => a.email.toLowerCase() === email);
}
