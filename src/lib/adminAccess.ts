import type { AdminEntry } from "@/types/task";

/**
 * Bootstrap admin set. These accounts are admins even if the Admins
 * SharePoint list is empty or unavailable — that way nobody can lock
 * themselves out by accidentally removing every entry. The list is the
 * authoritative source going forward; this set just guarantees there's
 * always a path back in.
 *
 * In mock mode, the demo user is on this list so the admin UI is
 * exercisable in the demo.
 *
 * This lives in a leaf module (no hook imports) so both `useIsAdmin` and the
 * admin/user-list mutation guards can share it without a circular import.
 */
export const BOOTSTRAP_ADMINS = new Set<string>([
  "ray.white@altronic-llc.com",
  "demo.user@altronic-llc.com",
]);

/**
 * Pure predicate: is `email` an admin, given the current Admins list? True for
 * the bootstrap set (always) or any email present on the list. Case-insensitive.
 */
export function isAdminEmail(
  email: string | null | undefined,
  admins: AdminEntry[],
): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (BOOTSTRAP_ADMINS.has(lower)) return true;
  return admins.some((a) => a.email.toLowerCase() === lower);
}
