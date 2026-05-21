import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteTaskFile,
  listProjectFolders,
  listTaskFiles,
  resolveFolderForProject,
  uploadTaskFile,
  type ProjectFile,
  type ProjectFolder,
  type ResolvedFolder,
} from "@/api/projectFiles";
import type { Task } from "@/types/task";

const FOLDERS_KEY = ["project-files", "folders"] as const;
const filesKey = (taskId: number) => ["project-files", "for-task", taskId] as const;

/** Cached list of every project folder + its tagged project lookupId. */
export function useProjectFolders() {
  return useQuery<ProjectFolder[]>({
    queryKey: FOLDERS_KEY,
    queryFn: listProjectFolders,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/**
 * Returns the resolved folder for this task (project folder if matched,
 * otherwise the Miscellaneous folder + filename prefix). Memoised so a
 * stable identity reaches the file-list / mutation hooks below.
 */
export function useResolvedTaskFolder(task: Task | null | undefined): {
  resolved: ResolvedFolder | null;
  isLoading: boolean;
  error: unknown;
} {
  const { data: folders = [], isLoading, error } = useProjectFolders();
  const resolved = useMemo(() => {
    if (!task) return null;
    return resolveFolderForProject(folders, task.parentProject);
  }, [folders, task]);
  return { resolved, isLoading, error };
}

/** Top-N most-recently-modified files for the task's project folder. */
export function useTaskFiles(task: Task | null | undefined) {
  const { resolved } = useResolvedTaskFolder(task);
  return useQuery<ProjectFile[]>({
    queryKey: filesKey(task?.id ?? 0),
    queryFn: () => (resolved ? listTaskFiles(resolved) : Promise.resolve([])),
    enabled: !!task && !!resolved,
    retry: false,
  });
}

export function useUploadTaskFile(task: Task | null | undefined) {
  const qc = useQueryClient();
  const { resolved } = useResolvedTaskFolder(task);
  return useMutation({
    mutationFn: (file: File) => {
      if (!resolved) throw new Error("No project folder resolved for this task yet.");
      return uploadTaskFile(resolved, file);
    },
    onSuccess: () => {
      if (task) qc.invalidateQueries({ queryKey: filesKey(task.id) });
    },
  });
}

export function useDeleteTaskFile(task: Task | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (driveItemId: string) => deleteTaskFile(driveItemId),
    onSuccess: () => {
      if (task) qc.invalidateQueries({ queryKey: filesKey(task.id) });
    },
  });
}
