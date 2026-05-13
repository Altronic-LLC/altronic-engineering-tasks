import { useCurrentUser } from "./useCurrentUser";

/**
 * Hardcoded list of emails authorised to see and use admin pages.
 *
 * TODO (backlog item: admin gating mechanism choice): replace this with a
 * SharePoint group-membership check or a dedicated permissions list. The
 * preferred long-term path is "Project Reference Admins" group on the
 * Altronic_Engineering site — check membership at sign-in via a single
 * Graph call to /me/memberOf. Until that's wired up, edits to this list
 * require a code push + deploy.
 *
 * In mock mode, the demo user IS an admin so the admin UI is exercisable
 * in the demo.
 */
const ADMIN_EMAILS = new Set<string>([
  "ray.white@altronic-llc.com",
  // Demo user (mock mode placeholder — see src/hooks/useCurrentUser.ts).
  // Safe to leave in production: a user can't claim this email in real
  // mode because real-mode emails come from MSAL's signed-in account.
  "demo.user@altronic-llc.com",
]);

/**
 * Returns true if the signed-in user is authorised to use the admin UI
 * (project-creation page, future admin features).
 */
export function useIsAdmin(): boolean {
  const user = useCurrentUser();
  if (!user.email) return false;
  return ADMIN_EMAILS.has(user.email.toLowerCase());
}
