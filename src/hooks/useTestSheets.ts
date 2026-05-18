import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTestSheet,
  listTestSheets,
  updateTestSheetFields,
  type CreateTestSheetInput,
} from "@/api/testSheets";
import type { TestSheet } from "@/types/task";

const TEST_SHEETS_KEY = ["testSheets", "list"] as const;

export function useTestSheets() {
  return useQuery({
    queryKey: TEST_SHEETS_KEY,
    queryFn: listTestSheets,
    staleTime: 120_000,
  });
}

/** Derived single-test-sheet view from the list cache. No extra fetch. */
export function useTestSheet(id: number | null) {
  const list = useTestSheets();
  return {
    ...list,
    data: id !== null ? list.data?.find((s) => s.id === id) ?? null : null,
  };
}

export function useCreateTestSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTestSheetInput) => createTestSheet(input),
    onSuccess: (created) => {
      qc.setQueryData<TestSheet[]>(TEST_SHEETS_KEY, (old) =>
        old ? [created, ...old] : [created],
      );
      // Also invalidate so anything that subscribes to the cache picks up
      // the server-side titles / author info that we don't have locally.
      qc.invalidateQueries({ queryKey: TEST_SHEETS_KEY });
    },
  });
}

export function useUpdateTestSheetFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      fields,
    }: {
      id: number;
      fields: Record<string, unknown>;
    }) => updateTestSheetFields(id, fields),
    onSuccess: (updated) => {
      qc.setQueryData<TestSheet[]>(TEST_SHEETS_KEY, (old) =>
        old?.map((s) => (s.id === updated.id ? updated : s)) ?? [updated],
      );
    },
  });
}
