import { useEffect, useState } from "react";
import { CURRENT_VERSION } from "@/data/changelog";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useVersionCheck() {
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkVersion() {
      try {
        const base = `${window.location.origin}${import.meta.env.BASE_URL ?? "/"}`;
        const url = new URL("version.json", base).toString();
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { version?: string };
        const version = typeof payload?.version === "string" ? payload.version : null;
        if (!mounted || version === null) return;

        setRemoteVersion(version);
        setUpdateAvailable(version !== CURRENT_VERSION);
      } catch {
        // Ignore network or parse failures; the app still works normally.
      }
    }

    checkVersion();
    const interval = window.setInterval(checkVersion, POLL_INTERVAL_MS);
    const onFocus = () => {
      if (!updateAvailable) {
        checkVersion();
      }
    };
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [updateAvailable]);

  return { updateAvailable, remoteVersion };
}
