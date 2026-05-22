import { BrowserAuthError, InteractionRequiredAuthError } from "@azure/msal-browser";
import { getMsalInstance } from "@/auth/AuthProvider";
import { graphScopes } from "@/auth/msalConfig";
import { GRAPH_BASE, USE_MOCK } from "./config";

/**
 * Make an authenticated request to Microsoft Graph.
 *
 * Acquires a token silently from MSAL's cache. If the silent flow fails
 * because the user needs to consent or re-authenticate, falls back to a
 * popup login.
 *
 * If the interactive popup also fails (user closed it, popup blocked,
 * network error), throws SessionExpiredError so callers can show a
 * graceful "please sign in again" UI instead of a raw error.
 */
export async function graphFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (USE_MOCK) {
    throw new Error("graphFetch called while VITE_USE_MOCK is true — check the call site.");
  }

  const instance = getMsalInstance();
  if (!instance) throw new Error("MSAL instance not initialised");

  const account = instance.getActiveAccount();
  if (!account) {
    // No active account — caller should have routed to SignInPage. Throw
    // SessionExpiredError so the gate re-renders cleanly.
    throw new SessionExpiredError("Not signed in");
  }

  let accessToken: string;
  try {
    const result = await instance.acquireTokenSilent({
      scopes: graphScopes,
      account: instance.getActiveAccount()!,
    });
    accessToken = result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      // Silent refresh failed — trigger a popup to re-authenticate.
      try {
        const result = await instance.acquireTokenPopup({ scopes: graphScopes });
        accessToken = result.accessToken;
      } catch (popupErr) {
        // Popup blocked, user cancelled, or popup errored — bubble up as
        // a session-expired so the app can show a friendly re-sign-in UI.
        if (popupErr instanceof BrowserAuthError) {
          throw new SessionExpiredError(popupErr.message);
        }
        throw popupErr;
      }
    } else {
      throw err;
    }
  }

  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    // 401 from Graph indicates the token was rejected — most often a
    // session that expired between the silent-acquire and the request.
    // Treat as session-expired.
    if (response.status === 401) {
      throw new SessionExpiredError(`Graph returned 401: ${body}`);
    }
    // Always log the full failure to the console — minified production
    // errors collapse the body to just the URL otherwise, which makes
    // diagnostics impossible. Include the request body too if there was
    // one, so we can correlate what we sent with how Graph rejected it.
    //
    // Also log the diagnostic claims from the access token (scp, roles,
    // aud, appid, tid, upn, exp). This is the only way to confirm a
    // missing-scope problem from the field — Graph returns 404 (not 403)
    // when a scope is missing, so the error code alone is ambiguous. The
    // full token is NEVER logged; only the JWT payload claims, which
    // aren't secret (they're decodable from any captured token).
    const tokenClaims = decodeJwtClaims(accessToken);
    /* eslint-disable no-console */
    console.error(
      `[Graph ${response.status}] ${init.method ?? "GET"} ${url}\n` +
        `Token claims: ${JSON.stringify(tokenClaims, null, 2)}\n` +
        `Request body: ${typeof init.body === "string" ? init.body : "(non-string)"}\n` +
        `Response body: ${body}`,
    );
    /* eslint-enable no-console */
    throw new GraphError(response.status, response.statusText, body, url);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/**
 * Walk @odata.nextLink pages until all items are collected. Used for lists
 * that may have more than the default page size (200 items at a time).
 */
export async function graphFetchAll<T>(path: string): Promise<T[]> {
  let url: string | undefined = path;
  const all: T[] = [];
  while (url) {
    const page: { value: T[]; "@odata.nextLink"?: string } = await graphFetch(url);
    all.push(...page.value);
    url = page["@odata.nextLink"];
  }
  return all;
}

export class GraphError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string,
    public url: string,
  ) {
    super(`Graph ${status} ${statusText} at ${url}: ${body}`);
    this.name = "GraphError";
  }
}

/**
 * Thrown when the user's MSAL session has expired or they cancelled an
 * interactive sign-in prompt. The app should treat this as "needs to sign
 * in again" — not as a generic error.
 */
export class SessionExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionExpiredError";
  }
}

/**
 * Diagnostic claims pulled from a Graph access token. These come from the
 * JWT payload, which isn't secret — but the keys we surface here are the
 * ones that actually help diagnose permission / scope issues:
 *
 *   - scp: space-separated delegated scopes (e.g. "Sites.Selected User.Read")
 *   - roles: array of app-only roles (empty for delegated tokens)
 *   - aud: audience — should be Graph (00000003-0000-0000-c000-000000000046 or the host)
 *   - appid: the Entra app registration id
 *   - tid: tenant id
 *   - upn: user principal name
 *   - exp: ISO timestamp the token expires
 *
 * Returns null if the token can't be decoded (malformed, wrong format, etc.).
 */
export interface AccessTokenClaims {
  scp?: string;
  roles?: string[];
  aud?: string;
  appid?: string;
  tid?: string;
  upn?: string;
  exp?: string;
}

export function decodeJwtClaims(token: string): AccessTokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1]!;
    // base64url → base64: swap `-`/`_` for `+`/`/`, then pad to 4-byte align.
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as Record<string, unknown>;
    return {
      scp: typeof json.scp === "string" ? json.scp : undefined,
      roles: Array.isArray(json.roles) ? (json.roles as string[]) : undefined,
      aud: typeof json.aud === "string" ? json.aud : undefined,
      appid: typeof json.appid === "string" ? json.appid : undefined,
      tid: typeof json.tid === "string" ? json.tid : undefined,
      upn: typeof json.upn === "string" ? json.upn : undefined,
      exp:
        typeof json.exp === "number"
          ? new Date(json.exp * 1000).toISOString()
          : undefined,
    };
  } catch {
    return null;
  }
}
