import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addEirRole,
  listEirRoles,
  removeEirRole,
  updateEirRole,
} from "@/api/eirRoles";
import { EIR_ROLES_ENFORCED } from "@/api/config";
import type { EirRoleEntry } from "@/types/task";
import { useCurrentUser } from "./useCurrentUser";

const EIR_ROLES_KEY = ["eir-roles", "list"] as const;

export function useEirRoles() {
  return useQuery<EirRoleEntry[]>({
    queryKey: EIR_ROLES_KEY,
    queryFn: listEirRoles,
    staleTime: 60_000,
  });
}

export function useAddEirRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addEirRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: EIR_ROLES_KEY }),
  });
}

export function useUpdateEirRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateEirRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: EIR_ROLES_KEY }),
  });
}

export function useRemoveEirRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeEirRole,
    onSuccess: () => qc.invalidateQueries({ queryKey: EIR_ROLES_KEY }),
  });
}

export interface MyEirRoles {
  isEngineer: boolean;
  isSupplyChain: boolean;
  /**
   * Whether gating should be applied at all. False when the EIR Roles list
   * isn't configured (real mode) — callers then leave every field editable.
   */
  enforced: boolean;
}

/**
 * Resolves the signed-in user's EIR role tags from the roles list. Used by
 * EirDetailView to decide which gated fields are editable. When the feature
 * isn't enforced (list unconfigured in real mode), `enforced` is false and
 * the role flags are irrelevant — callers should not gate anything.
 */
export function useMyEirRoles(): MyEirRoles {
  const user = useCurrentUser();
  const { data: entries = [] } = useEirRoles();

  if (!EIR_ROLES_ENFORCED) {
    return { isEngineer: false, isSupplyChain: false, enforced: false };
  }

  const email = (user.email ?? "").toLowerCase();
  const mine = email
    ? entries.find((e) => e.email.toLowerCase() === email)
    : undefined;
  const roles = mine?.roles ?? [];
  return {
    isEngineer: roles.includes("engineer"),
    isSupplyChain: roles.includes("supply chain"),
    enforced: true,
  };
}
