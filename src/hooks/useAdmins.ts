import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addAdmin, listAdmins, removeAdmin } from "@/api/admins";
import { isAdminEmail } from "@/lib/adminAccess";
import type { AdminEntry } from "@/types/task";
import { useCurrentUser } from "./useCurrentUser";

const ADMINS_KEY = ["admins", "list"] as const;

export function useAdmins() {
  return useQuery<AdminEntry[]>({
    queryKey: ADMINS_KEY,
    queryFn: listAdmins,
    staleTime: 60_000,
  });
}

/**
 * Resolves whether the signed-in user may edit the Admins list. Used to guard
 * the add/remove mutations below. This mirrors `useIsAdmin` but is inlined here
 * (rather than imported) to avoid a circular import: `useIsAdmin` imports this
 * module. It is defense-in-depth only — the views already hide these controls
 * from non-admins, and the real security boundary is SharePoint per-list
 * permissions.
 */
function useCanEditAdmins(): boolean {
  const user = useCurrentUser();
  const { data: admins = [] } = useAdmins();
  return isAdminEmail(user.email, admins);
}

export function useAddAdmin() {
  const qc = useQueryClient();
  const canEdit = useCanEditAdmins();
  return useMutation({
    mutationFn: (input: Parameters<typeof addAdmin>[0]) => {
      if (!canEdit) {
        throw new Error("Only admins can modify the Admins list.");
      }
      return addAdmin(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMINS_KEY }),
  });
}

export function useRemoveAdmin() {
  const qc = useQueryClient();
  const canEdit = useCanEditAdmins();
  return useMutation({
    mutationFn: (id: number) => {
      if (!canEdit) {
        throw new Error("Only admins can modify the Admins list.");
      }
      return removeAdmin(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMINS_KEY }),
  });
}
