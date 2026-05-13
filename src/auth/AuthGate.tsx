import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { useEffect, type ReactNode } from "react";
import { USE_MOCK } from "@/api/config";
import { SignInPage } from "./SignInPage";

/**
 * Decides whether to render the app or the SignInPage.
 *
 * In demo mode (USE_MOCK), we render the app directly with no auth check.
 * In real mode, we use MSAL's useIsAuthenticated hook to decide. If there
 * are no accounts, show the sign-in page; otherwise show the app.
 *
 * This component must be rendered INSIDE MsalProvider, which AuthProvider
 * handles. In mock mode AuthProvider doesn't render MsalProvider at all,
 * so this component isn't used in that path.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const { accounts, instance } = useMsal();

  // Ensure an active account is set whenever we have accounts but no active
  // one. This can happen on a fresh page load before any auth event fires.
  useEffect(() => {
    if (accounts.length > 0 && !instance.getActiveAccount()) {
      instance.setActiveAccount(accounts[0]);
    }
  }, [accounts, instance]);

  if (USE_MOCK) return <>{children}</>;
  if (!isAuthenticated) return <SignInPage />;
  return <>{children}</>;
}
