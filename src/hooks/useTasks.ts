import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addComment,
  createProject,
  createTask,
  deleteTask,
  editComment,
  listProjects,
  listTasks,
  setAssigned,
  setParentProject,
  setParentTask,
  setRelatedProjects,
  setTaskStatus,
  setWatchers,
  unwatchTask,
  updateTaskFields,
  watchTask,
} from "@/api/tasks";
import type {
  Category,
  CommentAttachment,
  Label,
  Person,
  Priority,
  ProjectReference,
  Status,
  Task,
} from "@/types/task";
import { CATEGORIES, LABELS, PRIORITIES, STATUSES } from "@/types/task";

const TASK_LIST_KEY = ["tasks", "list"] as const;
const PROJECTS_KEY = ["projects"] as const;

export function useTasks() {
  return useQuery({
    queryKey: TASK_LIST_KEY,
    queryFn: listTasks,
    // 2 minutes: long enough that view-switches (List ↔ Kanban) and tab
    // refocus feel instant without a network round-trip; short enough that
    // a freshly-edited task elsewhere shows up within a minute or two.
    // DetailView's background invalidate handles the live-comments case
    // independently.
    staleTime: 120_000,
  });
}

/**
 * Read a single task from the list cache, derived rather than separately
 * fetched. This means useTask never triggers its own network call — it
 * relies on useTasks (which the same component or a parent typically also
 * calls) to populate the cache.
 */
export function useTask(id: number | null) {
  const list = useTasks();
  return {
    ...list,
    data: id !== null ? list.data?.find((t) => t.id === id) ?? null : null,
  };
}

export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: listProjects,
    staleTime: 5 * 60_000,
  });
}

// =============================================================================
// Optimistic-update helpers
//
// Every mutation that touches a task should:
//   1. onMutate: snapshot the cache, apply the optimistic change, return the
//      snapshot as context for rollback.
//   2. onError: if context has a snapshot, restore it.
//   3. onSettled: invalidate the list so server truth (titles, lookup
//      resolutions, timestamps, etc.) wins after the round-trip.
//
// The helpers below shortcut that boilerplate. The point is to make every
// SharePoint write feel instant — the UI flips before the network does.
// =============================================================================

type RollbackContext = { previous?: Task[] };

async function snapshotAndPatch(
  qc: QueryClient,
  patch: (tasks: Task[]) => Task[],
): Promise<RollbackContext> {
  await qc.cancelQueries({ queryKey: TASK_LIST_KEY });
  const previous = qc.getQueryData<Task[]>(TASK_LIST_KEY);
  qc.setQueryData<Task[]>(TASK_LIST_KEY, (old) => (old ? patch(old) : []));
  return { previous };
}

function rollback(qc: QueryClient, context: RollbackContext | undefined) {
  if (context?.previous) qc.setQueryData(TASK_LIST_KEY, context.previous);
}

function invalidateTasks(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: TASK_LIST_KEY });
}

/** Patch a single task in the list by id. */
function patchTask(id: number, transform: (t: Task) => Task) {
  return (tasks: Task[]) => tasks.map((t) => (t.id === id ? transform(t) : t));
}

// =============================================================================
// Mutations — every one is optimistic.
// =============================================================================

export function useSetStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Status }) => setTaskStatus(id, status),
    onMutate: ({ id, status }) =>
      snapshotAndPatch(qc, patchTask(id, (t) => ({ ...t, status, modifiedAt: new Date() }))),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useUpdateTaskFields() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: number; fields: Record<string, unknown> }) =>
      updateTaskFields(id, fields),
    onMutate: ({ id, fields }) =>
      snapshotAndPatch(qc, patchTask(id, (t) => applyFieldsLocally(t, fields))),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useSetParentTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parentId }: { id: number; parentId: number | null }) =>
      setParentTask(id, parentId),
    onMutate: ({ id, parentId }) =>
      snapshotAndPatch(qc, (tasks) => {
        const parent = parentId != null ? tasks.find((t) => t.id === parentId) : null;
        return tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                parentTask: parent
                  ? {
                      id: parent.id,
                      numberedTitle: parent.numberedTitle,
                      status: parent.status,
                    }
                  : null,
                modifiedAt: new Date(),
              }
            : t,
        );
      }),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useSetParentProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, projectLookupId }: { id: number; projectLookupId: number | null }) =>
      setParentProject(id, projectLookupId),
    onMutate: ({ id, projectLookupId }) =>
      snapshotAndPatch(
        qc,
        patchTask(id, (t) => ({
          ...t,
          parentProject:
            projectLookupId != null
              ? resolveProject(qc, projectLookupId) ?? { lookupId: projectLookupId, title: "" }
              : null,
          modifiedAt: new Date(),
        })),
      ),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useSetRelatedProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lookupIds }: { id: number; lookupIds: number[] }) =>
      setRelatedProjects(id, lookupIds),
    onMutate: ({ id, lookupIds }) =>
      snapshotAndPatch(
        qc,
        patchTask(id, (t) => ({
          ...t,
          relatedProjects: lookupIds.map(
            (lid) => resolveProject(qc, lid) ?? { lookupId: lid, title: "" },
          ),
          modifiedAt: new Date(),
        })),
      ),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useSetAssigned() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, people }: { id: number; people: Person[] }) => setAssigned(id, people),
    onMutate: ({ id, people }) =>
      snapshotAndPatch(
        qc,
        patchTask(id, (t) => ({ ...t, assigned: people, modifiedAt: new Date() })),
      ),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useSetWatchers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, people }: { id: number; people: Person[] }) => setWatchers(id, people),
    onMutate: ({ id, people }) =>
      snapshotAndPatch(
        qc,
        patchTask(id, (t) => ({ ...t, watchers: people, modifiedAt: new Date() })),
      ),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useWatchTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, person }: { id: number; person: Person }) => watchTask(id, person),
    onMutate: ({ id, person }) =>
      snapshotAndPatch(
        qc,
        patchTask(id, (t) => {
          const key = (person.email ?? person.displayName).toLowerCase();
          const has = t.watchers.some((p) => (p.email ?? p.displayName).toLowerCase() === key);
          return has
            ? t
            : { ...t, watchers: [...t.watchers, person], modifiedAt: new Date() };
        }),
      ),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useUnwatchTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, person }: { id: number; person: Person }) => unwatchTask(id, person),
    onMutate: ({ id, person }) =>
      snapshotAndPatch(
        qc,
        patchTask(id, (t) => {
          const key = (person.email ?? person.displayName).toLowerCase();
          return {
            ...t,
            watchers: t.watchers.filter(
              (p) => (p.email ?? p.displayName).toLowerCase() !== key,
            ),
            modifiedAt: new Date(),
          };
        }),
      ),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      comment,
    }: {
      id: number;
      comment: {
        authorName: string;
        authorEmail: string;
        bodyHtml: string;
        attachments?: CommentAttachment[];
      };
    }) => addComment(id, comment),
    onMutate: ({ id, comment }) =>
      snapshotAndPatch(
        qc,
        patchTask(id, (t) => ({
          ...t,
          comments: [
            {
              timestamp: new Date(),
              authorName: comment.authorName,
              authorEmail: comment.authorEmail,
              bodyHtml: comment.bodyHtml,
              attachments: comment.attachments ?? [],
            },
            ...t.comments,
          ],
          modifiedAt: new Date(),
          hasAttachments:
            comment.attachments && comment.attachments.length > 0 ? true : t.hasAttachments,
        })),
      ),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useEditComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      target,
      newBodyHtml,
    }: {
      id: number;
      target: { timestamp: Date; authorEmail: string };
      newBodyHtml: string;
    }) => editComment(id, target, newBodyHtml),
    onMutate: ({ id, target, newBodyHtml }) =>
      snapshotAndPatch(
        qc,
        patchTask(id, (t) => ({
          ...t,
          comments: t.comments.map((c) =>
            c.timestamp.getTime() === target.timestamp.getTime() &&
            (c.authorEmail ?? "").toLowerCase() === target.authorEmail.toLowerCase()
              ? { ...c, bodyHtml: newBodyHtml }
              : c,
          ),
          modifiedAt: new Date(),
        })),
      ),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    // Create is the one mutation we don't go optimistic on: we'd need a
    // temporary client-side id, the detail-page navigation after success
    // would point at a non-existent task, and reconciling the temp id with
    // the server-assigned id gets fiddly. The form awaits the real result
    // and navigates after — the user gets accurate feedback either way.
    onSuccess: () => invalidateTasks(qc),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onMutate: (id: number) =>
      snapshotAndPatch(qc, (tasks) => tasks.filter((t) => t.id !== id)),
    onError: (_err, _vars, ctx) => rollback(qc, ctx),
    onSettled: () => invalidateTasks(qc),
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

// =============================================================================
// Helpers used by the optimistic update functions.
// =============================================================================

/** Look up a project by lookupId in the React Query projects cache. */
function resolveProject(qc: QueryClient, lookupId: number): ProjectReference | null {
  const projects = qc.getQueryData<ProjectReference[]>(PROJECTS_KEY);
  return projects?.find((p) => p.lookupId === lookupId) ?? null;
}

/**
 * Map a SharePoint-shaped fields object onto a Task for the optimistic
 * cache update. Mirrors the field-name mapping in taskMapper.ts (but in
 * the write direction).
 *
 * We touch only the keys the form actually sends — Title, Description,
 * Status, Priority, Category, DueDate, Labels, SoftwareRevision,
 * NumberedTitle. Communication is handled separately by useAddComment /
 * useEditComment so we don't try to re-parse it here. People fields are
 * handled by their own mutations (setAssigned / setWatchers).
 */
function applyFieldsLocally(t: Task, fields: Record<string, unknown>): Task {
  const next: Task = { ...t, modifiedAt: new Date() };

  if ("Title" in fields) next.title = (fields.Title as string) ?? next.title;
  if ("Description" in fields)
    next.description = (fields.Description as string) ?? next.description;
  if ("NumberedTitle" in fields)
    next.numberedTitle = (fields.NumberedTitle as string) ?? next.numberedTitle;
  if ("Status" in fields) {
    const v = fields.Status as string;
    if ((STATUSES as readonly string[]).includes(v)) next.status = v as Status;
  }
  if ("Priority" in fields) {
    const v = fields.Priority;
    if (v === null || v === undefined) next.priority = null;
    else if (typeof v === "string" && (PRIORITIES as readonly string[]).includes(v))
      next.priority = v as Priority;
  }
  if ("Category" in fields) {
    const v = fields.Category;
    if (v === null || v === undefined) next.category = null;
    else if (typeof v === "string" && (CATEGORIES as readonly string[]).includes(v))
      next.category = v as Category;
  }
  if ("DueDate" in fields) {
    const v = fields.DueDate;
    next.dueDate = v ? new Date(v as string) : null;
  }
  if ("Labels" in fields && Array.isArray(fields.Labels)) {
    next.labels = (fields.Labels as string[]).filter((l): l is Label =>
      (LABELS as readonly string[]).includes(l),
    );
  }
  if ("SoftwareRevision" in fields)
    next.softwareRevision = (fields.SoftwareRevision as string) ?? "";
  return next;
}
