import { graphFetch } from "./graph";
import { SP_SITE_ID, USE_MOCK } from "./config";

// =============================================================================
// Project-folder attachments for tasks.
//
// Files don't live on the task list-item; they live in the site's default
// Documents library under "General/Project Folders/<Project Folder>/". Each
// project folder carries a `Project Reference` lookup metadata column that
// ties it to a Project. Workflow:
//
//   1. Discover every folder under /General/Project Folders/ (one call,
//      cached for a few minutes).
//   2. Read each folder's `ProjectReferenceLookupId` field via the
//      listItem expansion.
//   3. When a task wants to upload / list, look up the folder by the
//      task's parentProject.lookupId.
//   4. If no folder matches, fall through to a hardcoded "Miscellaneous"
//      folder + prefix the filename with the task's project code so the
//      file is still findable.
//
// Auth: existing Graph `Sites.Selected` scope is enough — no separate
// SharePoint REST permission needed. (The list-item attachments path
// in src/api/attachments.ts uses SP REST and is still wired up for EIRs
// until they get migrated to this model.)
// =============================================================================

/** Library path containing project subfolders, relative to drive root. */
const PROJECT_FOLDERS_PATH = "General/Project Folders";
const MISC_FOLDER_NAME = "Miscellaneous";

/** How many recent files to surface on the task detail page. */
export const RECENT_FILES_LIMIT = 5;

/** Largest file we support via the simple PUT upload path (Graph limit ≈ 4 MB). */
const SIMPLE_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

export interface ProjectFile {
  /** Drive item id — used for delete. */
  id: string;
  name: string;
  /** Clickable link to the file in SharePoint. */
  webUrl: string;
  size: number;
  lastModified: Date;
}

export interface ProjectFolder {
  id: string;
  /** SharePoint folder display name (e.g. "NGI-5000"). */
  name: string;
  /** Clickable link to the folder in SharePoint. */
  webUrl: string;
  /** Project Reference lookupId attached to this folder via metadata. */
  projectLookupId: number;
}

/**
 * Resolved folder for a task. `kind: "project"` means we found a folder
 * tagged with the task's project; `kind: "misc"` means we're falling back
 * to the Miscellaneous folder and the filename will be prefixed.
 */
export type ResolvedFolder =
  | { kind: "project"; folder: ProjectFolder }
  | { kind: "misc"; folder: ProjectFolder; filenamePrefix: string };

/** Take the leading code from a project reference value. */
export function projectCodePrefix(projectRef: string): string {
  return projectRef.trim().split(/\s+/)[0] ?? "";
}

// ---------------------------------------------------------------------------
// Mock store — keyed by project lookupId. Sentinel id 0 = Miscellaneous.
// ---------------------------------------------------------------------------
const mockFiles = new Map<number, ProjectFile[]>();
let nextMockFileId = 1;

function mockNow() {
  return new Date();
}

// ---------------------------------------------------------------------------
// Folder discovery (cached by the React Query layer)
// ---------------------------------------------------------------------------

interface GraphDriveChild {
  id: string;
  name: string;
  webUrl: string;
  folder?: { childCount?: number };
  file?: unknown;
  size?: number;
  lastModifiedDateTime?: string;
  listItem?: { fields?: Record<string, unknown> };
}

function encodeDrivePath(segments: string[]): string {
  return segments.map((s) => encodeURIComponent(s)).join("/");
}

function readLookupId(fields: Record<string, unknown>): number {
  // Same auto-detect dance we use for EIR Project Reference: column
  // internal name varies (`ProjectReference`, `Project_x0020_Reference`,
  // …) so we scan any key whose name looks like the project ref column.
  for (const [key, raw] of Object.entries(fields)) {
    if (!/project/i.test(key)) continue;
    if (!/reference/i.test(key)) continue;
    if (typeof raw === "number" && raw > 0) return raw;
    if (typeof raw === "string") {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      for (const k of ["LookupId", "lookupId", "Id", "id"] as const) {
        const v = obj[k];
        if (typeof v === "number" && v > 0) return v;
        if (typeof v === "string") {
          const n = parseInt(v, 10);
          if (!Number.isNaN(n) && n > 0) return n;
        }
      }
    }
  }
  return 0;
}

/**
 * Fetch every project folder + its tagged project lookupId. The
 * Miscellaneous folder is included with projectLookupId=0 so callers
 * can use the same shape for fallback lookups.
 */
export async function listProjectFolders(): Promise<ProjectFolder[]> {
  if (USE_MOCK) {
    return [];
  }
  const path =
    `/sites/${SP_SITE_ID}/drive/root:/${encodeDrivePath(PROJECT_FOLDERS_PATH.split("/"))}` +
    `:/children?$expand=listItem($expand=fields)`;
  const res = await graphFetch<{ value: GraphDriveChild[] }>(path);
  const folders: ProjectFolder[] = [];
  for (const child of res.value ?? []) {
    if (!child.folder) continue; // skip stray files
    const fields = child.listItem?.fields ?? {};
    const projectLookupId =
      child.name === MISC_FOLDER_NAME ? 0 : readLookupId(fields);
    folders.push({
      id: child.id,
      name: child.name,
      webUrl: child.webUrl,
      projectLookupId,
    });
  }
  return folders;
}

/**
 * Resolve which folder a file should be written into for the given task
 * project. Returns the Miscellaneous folder with a filename prefix when
 * the project has no matching folder.
 */
export function resolveFolderForProject(
  folders: ProjectFolder[],
  parentProject: { lookupId: number; title: string } | null,
): ResolvedFolder | null {
  if (parentProject && parentProject.lookupId > 0) {
    const match = folders.find(
      (f) => f.projectLookupId === parentProject.lookupId && f.name !== MISC_FOLDER_NAME,
    );
    if (match) return { kind: "project", folder: match };
  }
  const misc = folders.find((f) => f.name === MISC_FOLDER_NAME);
  if (!misc) return null; // no Misc folder configured
  const prefix = parentProject ? projectCodePrefix(parentProject.title) : "";
  return { kind: "misc", folder: misc, filenamePrefix: prefix };
}

// ---------------------------------------------------------------------------
// List, upload, delete files
// ---------------------------------------------------------------------------

function mapDriveFile(c: GraphDriveChild): ProjectFile {
  return {
    id: c.id,
    name: c.name,
    webUrl: c.webUrl,
    size: c.size ?? 0,
    lastModified: c.lastModifiedDateTime ? new Date(c.lastModifiedDateTime) : new Date(0),
  };
}

/**
 * List the most-recently-modified files for the task's project (or Misc
 * with prefix filter). Returns at most `RECENT_FILES_LIMIT` files.
 */
export async function listTaskFiles(
  resolved: ResolvedFolder,
): Promise<ProjectFile[]> {
  if (USE_MOCK) {
    const key = resolved.kind === "project" ? resolved.folder.projectLookupId : 0;
    let list = (mockFiles.get(key) ?? []).slice();
    if (resolved.kind === "misc" && resolved.filenamePrefix) {
      list = list.filter((f) => f.name.startsWith(`${resolved.filenamePrefix}_`));
    }
    list.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    return list.slice(0, RECENT_FILES_LIMIT);
  }
  const path =
    `/sites/${SP_SITE_ID}/drive/items/${resolved.folder.id}/children` +
    `?$orderby=lastModifiedDateTime%20desc&$top=${RECENT_FILES_LIMIT * 3}` +
    `&$select=id,name,webUrl,size,lastModifiedDateTime,folder,file`;
  const res = await graphFetch<{ value: GraphDriveChild[] }>(path);
  let files = (res.value ?? []).filter((c) => c.file).map(mapDriveFile);
  if (resolved.kind === "misc" && resolved.filenamePrefix) {
    files = files.filter((f) => f.name.startsWith(`${resolved.filenamePrefix}_`));
  }
  return files.slice(0, RECENT_FILES_LIMIT);
}

/** Compute the actual filename to write (applies the Misc prefix). */
export function targetFilename(resolved: ResolvedFolder, originalName: string): string {
  if (resolved.kind === "misc" && resolved.filenamePrefix) {
    return `${resolved.filenamePrefix}_${originalName}`;
  }
  return originalName;
}

export async function uploadTaskFile(
  resolved: ResolvedFolder,
  file: File,
): Promise<ProjectFile> {
  if (file.size > SIMPLE_UPLOAD_MAX_BYTES) {
    throw new Error(
      `File "${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — larger than the 4 MB simple-upload limit. Large-file upload sessions are on the backlog.`,
    );
  }
  const finalName = targetFilename(resolved, file.name);

  if (USE_MOCK) {
    const key = resolved.kind === "project" ? resolved.folder.projectLookupId : 0;
    const entry: ProjectFile = {
      id: `mock-${nextMockFileId++}`,
      name: finalName,
      webUrl: URL.createObjectURL(file),
      size: file.size,
      lastModified: mockNow(),
    };
    const next = [...(mockFiles.get(key) ?? []), entry];
    mockFiles.set(key, next);
    return entry;
  }
  const bytes = await file.arrayBuffer();
  const path =
    `/sites/${SP_SITE_ID}/drive/items/${resolved.folder.id}` +
    `:/${encodeURIComponent(finalName)}:/content`;
  const res = await graphFetch<GraphDriveChild>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: bytes,
  });
  return mapDriveFile(res);
}

export async function deleteTaskFile(driveItemId: string): Promise<void> {
  if (USE_MOCK) {
    for (const [k, list] of mockFiles) {
      const next = list.filter((f) => f.id !== driveItemId);
      if (next.length !== list.length) {
        mockFiles.set(k, next);
        return;
      }
    }
    return;
  }
  await graphFetch(`/sites/${SP_SITE_ID}/drive/items/${driveItemId}`, {
    method: "DELETE",
  });
}
