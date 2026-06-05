import { RefreshCw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useVersionCheck } from "@/hooks/useVersionCheck";

export function UpdateAvailableBanner() {
  const location = useLocation();
  const { updateAvailable, remoteVersion } = useVersionCheck(
    `${location.pathname}${location.search}`,
  );
  if (!updateAvailable) return null;

  return (
    <div className="border-b border-accent/20 bg-accent/5 text-sm text-fg py-3">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2 text-sm">
          <RefreshCw className="h-4 w-4 text-accent" />
          <span>
            A new version of ARC is available{remoteVersion ? ` (${remoteVersion})` : ""}. Refresh the page to load the latest changes.
          </span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md border border-accent px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
