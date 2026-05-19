import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTestSheet,
  listTestSheets,
  updateTestSheetFields,
  type CreateTestSheetInput,
} from "@/api/testSheets";
import type { Person, TestSheet } from "@/types/task";

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

/**
 * Optimistic test sheet update — patches the cache before the network
 * round-trip completes, just like the task mutations. Mirrors the field
 * mapping in testSheetMapper.ts (write direction).
 */
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
    onMutate: async ({ id, fields }) => {
      await qc.cancelQueries({ queryKey: TEST_SHEETS_KEY });
      const previous = qc.getQueryData<TestSheet[]>(TEST_SHEETS_KEY);
      qc.setQueryData<TestSheet[]>(TEST_SHEETS_KEY, (old) =>
        old?.map((s) => (s.id === id ? applyTestSheetFieldsLocally(s, fields) : s)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, ctx: { previous?: TestSheet[] } | undefined) => {
      if (ctx?.previous) qc.setQueryData(TEST_SHEETS_KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: TEST_SHEETS_KEY });
    },
  });
}

function applyTestSheetFieldsLocally(
  s: TestSheet,
  fields: Record<string, unknown>,
): TestSheet {
  const next: TestSheet = { ...s, modifiedAt: new Date() };
  if ("Title" in fields) next.title = (fields.Title as string) ?? next.title;
  if ("Product" in fields) next.product = (fields.Product as string) ?? "";
  if ("SerialNumber" in fields) next.serialNumber = (fields.SerialNumber as string) ?? "";
  if ("Purpose" in fields) next.purpose = (fields.Purpose as string) ?? "";
  if ("Results" in fields) next.results = (fields.Results as string) ?? "";
  if ("TestingSteps" in fields) next.testingSteps = (fields.TestingSteps as string) ?? "";
  if ("FirmwareVersion" in fields)
    next.firmwareVersion = (fields.FirmwareVersion as string) ?? "";
  if ("TestDate" in fields) {
    const v = fields.TestDate;
    next.testDate = v ? new Date(v as string) : null;
  }
  if ("ProjectReferenceLookupId" in fields) {
    const v = fields.ProjectReferenceLookupId;
    next.parentProject = v ? { lookupId: Number(v), title: s.parentProject?.title ?? "" } : null;
  }
  if ("TaskReferenceLookupId" in fields) {
    const v = fields.TaskReferenceLookupId;
    next.parentTask = v
      ? { id: Number(v), numberedTitle: s.parentTask?.numberedTitle ?? "" }
      : null;
  }
  if ("Tester" in fields) {
    const v = fields.Tester;
    if (v === null || v === undefined) {
      next.tester = null;
    } else if (Array.isArray(v) || (typeof v === "object" && "displayName" in (v as object))) {
      next.tester = (Array.isArray(v) ? v[0] : v) as Person;
    }
  }
  return next;
}
