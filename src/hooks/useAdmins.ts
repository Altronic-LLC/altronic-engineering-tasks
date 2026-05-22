import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addAdmin, listAdmins, removeAdmin } from "@/api/admins";
import type { AdminEntry } from "@/types/task";

const ADMINS_KEY = ["admins", "list"] as const;

export function useAdmins() {
  return useQuery<AdminEntry[]>({
    queryKey: ADMINS_KEY,
    queryFn: listAdmins,
    staleTime: 60_000,
  });
}

export function useAddAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addAdmin,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMINS_KEY }),
  });
}

export function useRemoveAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeAdmin,
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMINS_KEY }),
  });
}
