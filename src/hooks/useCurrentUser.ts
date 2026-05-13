import { useMemo } from "react";
import { useMsal } from "@azure/msal-react";
import type { Person } from "@/types/task";
import { USE_MOCK } from "@/api/config";

/**
 * Identifies the signed-in user as a `Person`. In mock mode this is a
 * fixed placeholder (so demo flows like watching tasks and posting
 * comments still work). In real mode this comes from MSAL's active
 * account.
 *
 * Note: the lookupId for the real-mode user is unknown to us until we
 * resolve their SharePoint user ID, which requires an extra Graph call
 * to /me/profile (or to the site's /users endpoint with a filter). For
 * now we leave it 0 and the write paths fall back to email-matching;
 * a refinement task can resolve and cache the lookupId on first sign-in.
 */
export function useCurrentUser(): Person {
  // `useMsal` only works inside MsalProvider; safe to call here because
  // AuthProvider renders the children inside MsalProvider in real mode
  // and the demo-mode branch in this hook short-circuits before reading
  // the accounts.
  const msal = useMsal();

  return useMemo<Person>(() => {
    if (USE_MOCK) {
      return {
        displayName: "Demo User",
        email: "demo.user@altronic-llc.com",
        lookupId: 0,
      };
    }

    const account = msal.accounts[0];
    if (!account) {
      // No account active — shouldn't happen if AuthProvider is doing its
      // job, but fall back to a sane placeholder rather than crashing.
      return { displayName: "Unknown user", email: "", lookupId: 0 };
    }
    return {
      displayName: account.name ?? account.username,
      email: account.username,
      lookupId: 0,
    };
  }, [msal.accounts]);
}
