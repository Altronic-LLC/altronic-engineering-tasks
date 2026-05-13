import { useState } from "react";
import { LogIn } from "lucide-react";
import { getMsalInstance } from "@/auth/AuthProvider";
import { graphScopes } from "@/auth/msalConfig";
import { Brandmark } from "@/components/brand/Brandmark";
import { Wordmark } from "@/components/brand/Wordmark";

/**
 * Sign-in landing page. Shown when:
 *   - We're in real mode (USE_MOCK is false), AND
 *   - No MSAL account is signed in.
 *
 * This is a full-page gate — users must sign in to reach any task data.
 * In demo mode (USE_MOCK=true) the AuthProvider tree skips MSAL entirely
 * and renders the app directly, so this page never appears in the demo.
 *
 * The actual sign-in is a popup, not a redirect. After successful sign-in
 * MSAL fires LOGIN_SUCCESS which AuthProvider listens for; the parent
 * AuthGate component then re-renders and shows the app.
 */
export function SignInPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    const msal = getMsalInstance();
    if (!msal) {
      setError("Authentication is not configured.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await msal.loginPopup({ scopes: graphScopes });
      // On success, the AuthProvider's LOGIN_SUCCESS handler sets the
      // active account, and the parent re-renders. Nothing more to do here.
    } catch (err) {
      // User closed the popup, popup was blocked, etc.
      const message =
        err instanceof Error ? err.message : "Sign-in was cancelled or failed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-bg">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3 text-fg">
              <Brandmark className="h-14 w-auto" />
              <div className="flex flex-col items-start leading-tight">
                <Wordmark className="h-5 w-auto" />
                <p className="mt-1 font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-muted">
                  Engineering Task System
                </p>
              </div>
            </div>

            <p className="mt-8 max-w-sm text-sm text-fg-muted">
              Sign in with your Altronic / Hoerbiger Microsoft account to view
              and manage engineering tasks. You'll only see data you already
              have access to in SharePoint.
            </p>

            <button
              onClick={handleSignIn}
              disabled={busy}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              {busy ? "Opening sign-in…" : "Sign in with Microsoft"}
            </button>

            {error && (
              <div className="mt-4 max-w-sm rounded-md border border-cooper-red/30 bg-cooper-red/10 px-3 py-2 text-xs text-cooper-red">
                {error}
              </div>
            )}

            <div className="mt-12 text-[11px] text-fg-muted">
              By signing in you agree that this app may read and write task
              data on your behalf via Microsoft Graph.
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-border bg-surface px-6 py-3 text-center text-xs text-fg-muted">
        Altronic Engineering Task System &middot; Developed by{" "}
        <a
          href="mailto:ray.white@altronic-llc.com"
          className="text-fg underline-offset-2 hover:text-accent hover:underline"
        >
          ray.white@altronic-llc.com
        </a>
      </footer>
    </div>
  );
}
