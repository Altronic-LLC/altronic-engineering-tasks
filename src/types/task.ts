// =============================================================================
// Domain types — modelled directly on the SharePoint columns we discovered
// during PowerShell exploration. Field names match the SharePoint internal
// `name` (not the displayName) because that's what Graph returns under
// `item.fields`.
// =============================================================================

/** All allowed Status values, in the order they should appear on the Kanban board. */
export const STATUSES = [
  "BACKLOG",
  "SELECTED FOR DEVELOPMENT",
  "In Progress",
  "On Hold",
  "Blocked",
  "Complete",
] as const;

export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["Low", "Medium", "High"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CATEGORIES = [
  "Software",
  "Hardware",
  "UI",
  "Drawing",
  "Documentation",
  "Field Trial",
  "Build Request",
  "Product Certification",
  "Label Change",
  "PCB",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const LABELS = [
  "bug",
  "documentation",
  "duplicate",
  "enhancement",
  "good first issue",
  "help wanted",
  "invalid",
  "question",
  "wontfix",
] as const;
export type Label = (typeof LABELS)[number];

/** A person reference, as stored in the `Assigned` / `Watchers` person fields. */
export interface Person {
  displayName: string;
  email?: string;
  /** SharePoint user lookup ID (used when writing back). */
  lookupId?: number;
}

/** One parsed comment from the `Communication` field. */
export interface Comment {
  /** Date the comment was created. */
  timestamp: Date;
  /** Author's display name. */
  authorName: string;
  /** Author's email (used for @-mention rendering and avatars later). */
  authorEmail: string;
  /** HTML body as authored. Render through a sanitizer before injecting. */
  bodyHtml: string;
  /** Attachments captured with the comment. Empty array if none. */
  attachments?: CommentAttachment[];
}

/**
 * A file or image attached to a comment.
 *
 * In demo/mock mode these live in memory only — `objectUrl` is a blob URL
 * from URL.createObjectURL(). When real mode is wired up, attachments will
 * be uploaded to a SharePoint document library with rules to be defined
 * later; at that point we'll add a `sharepointUrl` field and the upload
 * step will go through src/api/attachments.ts.
 */
export interface CommentAttachment {
  /** Stable id within the comment (used as a React key). */
  id: string;
  /** Original filename as the user uploaded it. */
  filename: string;
  /** MIME type from the File object (e.g. "image/png"). */
  contentType: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** Blob URL for previewing during the session. Revoke when no longer needed. */
  objectUrl?: string;
}

/** A parent project reference, resolved from the lookup. */
export interface ProjectReference {
  lookupId: number;
  title: string; // e.g. "0000-Engineering Apps"
}

/**
 * A bare reference to another task — just the bits we need to render a
 * pill/link without re-fetching the full task. Used for parent and child
 * task references.
 */
export interface TaskRef {
  id: number;
  numberedTitle: string;
  status: Status;
}

/** The fully-shaped task we work with in the UI. */
export interface Task {
  /** SharePoint list item ID (numeric, used in API paths). */
  id: number;
  /** Auto-generated public-facing identifier, e.g. "T115-0000-Title". */
  numberedTitle: string;
  /** Plain title (no prefix). */
  title: string;
  /** Long-form description (HTML or plain text). */
  description: string;
  status: Status;
  priority: Priority | null;
  category: Category | null;
  labels: Label[];
  dueDate: Date | null;
  createdAt: Date;
  modifiedAt: Date;
  /** Author lookup ID; resolved to a Person if we have the directory. */
  authorLookupId: number;
  /** Editor lookup ID. */
  editorLookupId: number;
  /** Parent project — null if not set. */
  parentProject: ProjectReference | null;
  /** Other related projects (multi-value lookup). Empty array if none. */
  relatedProjects: ProjectReference[];
  /** Parent task — null if this task is top-level. */
  parentTask: TaskRef | null;
  /**
   * Child tasks (derived — not stored on the task itself; computed by
   * scanning other tasks whose parent points at this one).
   */
  childTasks: TaskRef[];
  /** People the task is assigned to. */
  assigned: Person[];
  /** People watching for updates. */
  watchers: Person[];
  /**
   * Software revision string — free-text field used for tracking which
   * firmware / app version a task targets. The SharePoint internal field
   * name needs to be verified; the mapper assumes `SoftwareRevision`.
   */
  softwareRevision: string;
  /** Parsed comments, newest first. */
  comments: Comment[];
  /** Whether the item has SharePoint attachments. */
  hasAttachments: boolean;
}

// =============================================================================
// Microsoft Graph response shapes — only the fields we touch
// =============================================================================

export interface GraphListItem {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  fields: GraphItemFields;
}

export interface GraphItemFields {
  id?: string;
  Title?: string;
  NumberedTitle?: string;
  Description?: string;
  Status?: string;
  Priority?: string;
  Category?: string;
  Labels?: string;
  DueDate?: string;
  Created?: string;
  Modified?: string;
  AuthorLookupId?: string | number;
  EditorLookupId?: string | number;
  Parent_x0020_Project_x0020_ReferLookupId?: string | number;
  /**
   * Multi-value related-projects lookup. SharePoint returns multi-value
   * lookup fields as an array of { LookupId, LookupValue } objects under
   * `<FieldName>` (not `<FieldName>LookupId`). The field's actual internal
   * name needs to be verified — `ProjectReference` is the best guess from
   * our PowerShell exploration (it came back as `{}`, which is the empty
   * state for a multi-value lookup). Run the column-discovery query in
   * CLAUDE.md against the task list to confirm.
   */
  ProjectReference?: unknown;
  /**
   * Parent task lookup. Internal field name TBD — common patterns are
   * `ParentTaskLookupId` or `Parent_x0020_Task_x0020_ReferLookupId`. Run
   * column discovery to confirm. The mapper falls back gracefully when
   * the field is absent so the app keeps working until we know the name.
   */
  ParentTaskLookupId?: string | number;
  /**
   * Software revision text field. Internal name assumed `SoftwareRevision`;
   * verify against the actual SharePoint column. Free-text in the Power App.
   */
  SoftwareRevision?: string;
  Attachments?: boolean;
  Communication?: string;
  /** Person-or-group fields are returned as hashtables/objects. Shape varies. */
  Assigned?: unknown;
  Watchers?: unknown;
  /** Anything else SharePoint hands us — we don't enumerate all 200 columns. */
  [key: string]: unknown;
}

export interface GraphListResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
}
