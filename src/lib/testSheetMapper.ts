import type {
  GraphListItem,
  Person,
  ProjectReference,
  TestSheet,
  TestSheetItemFields,
} from "@/types/task";

/**
 * Map a raw Graph list item from the Test Results list to a TestSheet.
 * Boundary between SharePoint's loose shape (string-heavy, lossy types,
 * internal column names) and the typed domain model.
 *
 * Project and Task references come back as LookupId integers — the human
 * titles aren't filled in here; the caller resolves them by joining
 * against the projects + tasks caches.
 */
export function toTestSheet(item: GraphListItem): TestSheet {
  const f = (item.fields ?? {}) as unknown as TestSheetItemFields;

  return {
    id: parseInt(item.id, 10),
    title: (f.Title as string) ?? "(untitled test sheet)",
    product: (f.Product as string) ?? "",
    serialNumber: (f.SerialNumber as string) ?? "",
    purpose: (f.Purpose as string) ?? "",
    results: (f.Results as string) ?? "",
    testDate: parseDate(f.TestDate as string | undefined),
    parentProject: f.ProjectReferenceLookupId
      ? { lookupId: toInt(f.ProjectReferenceLookupId, 0), title: "" }
      : null,
    parentTask: f.TaskReferenceLookupId
      ? { id: toInt(f.TaskReferenceLookupId, 0), numberedTitle: "" }
      : null,
    tester: parsePersonSingle(f.Tester),
    testingSteps: (f.TestingSteps as string) ?? "",
    firmwareVersion: (f.FirmwareVersion as string) ?? "",
    createdAt: new Date(item.createdDateTime),
    modifiedAt: new Date(item.lastModifiedDateTime),
    author: parseCreatedByUser(item.createdBy),
  };
}

/**
 * Resolve the placeholder project + task titles on each test sheet by
 * looking them up in the supplied catalogues. Mirrors the
 * attachProjectTitles pattern from `taskGraph.ts`. Mutates in place and
 * returns the array for convenience.
 */
export function attachTestSheetReferences(
  sheets: TestSheet[],
  projects: ProjectReference[],
  tasks: { id: number; numberedTitle: string }[],
): TestSheet[] {
  const projectsById = new Map(projects.map((p) => [p.lookupId, p.title]));
  const tasksById = new Map(tasks.map((t) => [t.id, t.numberedTitle]));
  for (const s of sheets) {
    if (s.parentProject) {
      s.parentProject.title = projectsById.get(s.parentProject.lookupId) ?? s.parentProject.title;
    }
    if (s.parentTask) {
      s.parentTask.numberedTitle =
        tasksById.get(s.parentTask.id) ?? s.parentTask.numberedTitle;
    }
  }
  return sheets;
}

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toInt(raw: unknown, fallback: number): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

/**
 * Single-person field handling. Tester is a single-person column, but Graph
 * sometimes returns it as an array of one anyway depending on the column's
 * settings. Accept both shapes.
 */
function parsePersonSingle(raw: unknown): Person | null {
  if (!raw) return null;
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (typeof entry !== "object" || entry === null) return null;
  const obj = entry as Record<string, unknown>;
  const displayName =
    (obj.LookupValue as string) ?? (obj.displayName as string) ?? (obj.title as string);
  if (!displayName) return null;
  return {
    displayName,
    email: (obj.Email as string) ?? (obj.email as string),
    lookupId: toInt(obj.LookupId ?? obj.lookupId, 0),
  };
}

/** Same as task author mapping — pulls from the listItem envelope's createdBy. */
function parseCreatedByUser(
  createdBy: { user?: { displayName?: string; email?: string } } | undefined,
): Person | null {
  const user = createdBy?.user;
  if (!user || !user.displayName) return null;
  return {
    displayName: user.displayName,
    email: user.email,
  };
}
