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
 *   project    → projectIds  (comma-separated integers, e.g. "10,20")
 *   assigned   → assignedEmails (comma-separated emails)
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
    const assignedRaw = searchParams.get("assigned");
    const createdByRaw = searchParams.get("createdBy");
    return {
      search: searchParams.get("q") ?? "",
      projectIds: parseIntList(projectRaw),
      // assignedEmails: empty array means explicit "Anyone" when the param
      // is present, OR not-yet-defaulted when the param is absent. Either
      // way, applyFilters skips the assigned check.
      assignedEmails: parseStringList(assignedRaw),
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
          if (next.projectIds.length > 0) out.set("project", next.projectIds.join(","));
          else out.delete("project");
          // assignedEmails: always present in URL after first interaction.
          // Empty array → explicit "Anyone" (preserved as ?assigned= so the
          // first-visit default doesn't re-apply on refresh).
          if (next.assignedEmails.length > 0) out.set("assigned", next.assignedEmails.join(","));
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

function parseIntList(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^-?\d+$/.test(s))
    .map((s) => parseInt(s, 10));
}

function parseStringList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
