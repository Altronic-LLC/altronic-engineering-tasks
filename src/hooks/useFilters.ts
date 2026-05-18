import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import type { Filters } from "@/components/FilterBar";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Filter state lifted into URL search params so it survives view switching,
 * refreshes, and shared links. Both ListView and KanbanView use this hook
 * to read/write the same source of truth.
 *
 * URL param keys (intentionally short to keep address bar tidy):
 *   q          → search
 *   project    → projectId (integer)
 *   assigned   → assignedEmail (string, possibly empty)
 *   createdBy  → createdByEmail
 *
 * "Assigned to me" default: on first visit (URL has no `assigned` param at
 * all), we write the signed-in user's email into the URL so the home page
 * shows their tasks. If the URL has `?assigned=` (empty value, meaning the
 * user previously picked "Anyone"), we respect that — the default doesn't
 * re-apply on refresh / back-navigation.
 */
export function useFilters(): [Filters, (next: Filters) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const me = useCurrentUser();
  const defaulted = useRef(false);

  // First-visit default: only fires when `assigned` is absent from the URL.
  // useRef guards against double-fire under React 18 strict-mode dev rendering.
  useEffect(() => {
    if (defaulted.current) return;
    if (searchParams.has("assigned")) {
      defaulted.current = true;
      return;
    }
    if (!me.email) return; // wait until current-user is known
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("assigned", me.email!);
        return next;
      },
      { replace: true },
    );
    defaulted.current = true;
  }, [me.email, searchParams, setSearchParams]);

  const filters: Filters = useMemo(() => {
    const projectRaw = searchParams.get("project");
    const projectId =
      projectRaw && /^-?\d+$/.test(projectRaw) ? parseInt(projectRaw, 10) : null;
    const assignedRaw = searchParams.get("assigned");
    const createdByRaw = searchParams.get("createdBy");
    return {
      search: searchParams.get("q") ?? "",
      projectId,
      // Empty-string assigned means "explicitly Anyone" — present in URL,
      // null in the filter shape. The presence of the param suppresses the
      // first-visit default; the null tells applyFilters to skip the check.
      assignedEmail: assignedRaw ? assignedRaw : null,
      createdByEmail: createdByRaw ? createdByRaw : null,
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (next: Filters) => {
      setSearchParams(
        (prev) => {
          const out = new URLSearchParams(prev);
          if (next.search) out.set("q", next.search);
          else out.delete("q");
          if (next.projectId != null) out.set("project", String(next.projectId));
          else out.delete("project");
          // assignedEmail: always present in URL after first interaction.
          // null/empty → explicit "Anyone" (preserved so the default doesn't
          // re-apply on refresh).
          if (next.assignedEmail) out.set("assigned", next.assignedEmail);
          else out.set("assigned", "");
          if (next.createdByEmail) out.set("createdBy", next.createdByEmail);
          else out.delete("createdBy");
          return out;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return [filters, setFilters];
}
