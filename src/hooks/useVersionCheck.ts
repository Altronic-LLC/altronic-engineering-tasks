import { useEffect, useSyncExternalStore } from "react";
import { CURRENT_VERSION } from "@/data/changelog";

const POLL_INTERVAL_MS = 2 * 60 * 1000;

let remoteVersion: string | null = null;
let updateAvailable = false;
let snapshot: { remoteVersion: string | null; updateAvailable: boolean } = {
  updateAvailable,
  remoteVersion,
};
let listeners: Array<() => void> = [];
let started = false;

function notify() {
  for (const fn of listeners) fn();
}

function getSnapshot() {
  return snapshot;
}

function subscribe(fn: () => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((listener) => listener !== fn);
  };
}

async function refreshVersion() {
  try {
    if (typeof window === "undefined") return;
    const base = `${window.location.origin}${import.meta.env.BASE_URL ?? "/"}`;
    const url = new URL("version.json", base).toString();
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as { version?: string };
    const version = typeof payload?.version === "string" ? payload.version : null;
    if (version === null) return;

    const nextUpdateAvailable = version !== CURRENT_VERSION;
    if (version !== remoteVersion || nextUpdateAvailable !== updateAvailable) {
      remoteVersion = version;
      updateAvailable = nextUpdateAvailable;
      snapshot = { remoteVersion, updateAvailable };
      notify();
    }
  } catch {
    // Ignore network or parse failures; the app still works normally.
  }
}

function startVersionCheck() {
  if (started || typeof window === "undefined") return;
  started = true;

  refreshVersion();
  const interval = window.setInterval(refreshVersion, POLL_INTERVAL_MS);
  const onFocus = () => refreshVersion();
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      refreshVersion();
    }
  };

  window.addEventListener("focus", onFocus);
  window.addEventListener("visibilitychange", onVisibility);

  // No cleanup required for the lifetime of the SPA.
  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("visibilitychange", onVisibility);
  };
}

export function useVersionCheck(watchValue?: unknown) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    const cleanup = startVersionCheck();
    return cleanup;
  }, []);

  useEffect(() => {
    refreshVersion();
  }, [watchValue]);

  return state;
}

export function resetVersionCheck() {
  remoteVersion = null;
  updateAvailable = false;
  snapshot = { updateAvailable, remoteVersion };
  listeners = [];
  started = false;
}
