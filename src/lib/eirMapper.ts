import type {
  Eir,
  EirItemFields,
  EirMeetingRelevant,
  EirRequestedPriority,
  EirRequestType,
  EirResolution,
  EirRiskLevel,
  EirRiskPart,
  EirStatus,
  GraphListItem,
  Person,
  ProjectReference,
} from "@/types/task";
import {
  EIR_MEETING_RELEVANTS,
  EIR_REQUEST_TYPES,
  EIR_REQUESTED_PRIORITIES,
  EIR_RESOLUTIONS,
  EIR_RISK_LEVELS,
  EIR_RISK_PARTS,
  EIR_STATUSES,
} from "@/types/task";
import { parseCommunication } from "./communicationParser";

/**
 * Graph list item → Eir. Mirrors src/lib/taskMapper.ts in shape — boundary
 * between the SharePoint wire format and the typed domain. Internal column
 * names are quirky (escaped slashes, x0020 spaces, truncated long names)
 * so this file is the place to absorb that ugliness.
 */
export function toEir(item: GraphListItem): Eir {
  const f = (item.fields ?? {}) as unknown as EirItemFields;

  return {
    id: parseInt(item.id, 10),
    eirNo: (f.EIRNo as string) ?? "",
    title: (f.Title as string) ?? "(untitled EIR)",
    description: (f.Description as string) ?? "",
    requestType: clampOptional<EirRequestType>(f.RequestType, EIR_REQUEST_TYPES),
    status: clampRequired<EirStatus>(f.Status, EIR_STATUSES, "Under Review"),
    resolution: clampRequired<EirResolution>(f.Resolution, EIR_RESOLUTIONS, "Pending"),
    requestedPriority: clampOptional<EirRequestedPriority>(
      f.Priority,
      EIR_REQUESTED_PRIORITIES,
    ),

    reporter: parsePersonSingle(f.Reporter),
    assignedEngineers: parsePersonMulti(f.AssignedEngineer),
    watchers: parsePersonMulti(f.Watchers),
    parentProject: readProjectLookupId(f),
    taskReference: (f.TaskReference as string) ?? "",

    engineeringResponse: (f.EngineeringResponse as string) ?? "",

    whereUsed: (f.WhereUsed as string) ?? "",
    eau: (f.EAU as string) ?? "",
    currentStock: (f.CurrentStock as string) ?? "",
    mfg: (f.MFG as string) ?? "",
    mfgPartNumber: (f.MFGP_x002f_N as string) ?? "",
    currentPrice: (f.Current_x0020_Price as string) ?? "",
    altronicPartNumber: (f.Altronic_x0020_Part_x0020_Number as string) ?? "",

    requestedCompletionDate: parseDate(f.Requested_x0020_Completion_x0020),
    ltbDate: parseDate(f.LTBDate),
    priorityDate: parseDate(f.PriorityDate),

    priorityNumber: parseNullableNumber(f.Priority0),
    priorityCount: parseNullableNumber(f.PriorityCount),
    technicalPriority: clampOptional<EirRiskLevel>(f.TechnicalPriority, EIR_RISK_LEVELS),
    riskPart: clampOptional<EirRiskPart>(f.RiskPart, EIR_RISK_PARTS),
    riskPartLevel: clampOptional<EirRiskLevel>(f.RiskPartLevel, EIR_RISK_LEVELS),

    eirMeetingRelevant: clampOptional<EirMeetingRelevant>(
      f.EIRMeetingRelevant,
      EIR_MEETING_RELEVANTS,
    ),
    buyerCode: (f.BuyerCode as string) ?? "",
    taskPromotedFlag: !!f.TaskPromotedFlag,

    createdAt: new Date(item.createdDateTime),
    modifiedAt: new Date(item.lastModifiedDateTime),
    author: parseCreatedByUser(item.createdBy),
    comments: parseCommunication(f.Communication as string),
    hasAttachments: !!f.Attachments,
  };
}

/** Resolve project + task lookup titles by joining against the supplied caches. */
export function attachEirReferences(
  eirs: Eir[],
  projects: ProjectReference[],
): Eir[] {
  const byId = new Map(projects.map((p) => [p.lookupId, p.title]));
  for (const e of eirs) {
    if (e.parentProject && e.parentProject.lookupId > 0) {
      // Only override a blank title — if the mapper already extracted a
      // title from a string/managed-metadata value, that's authoritative.
      const joined = byId.get(e.parentProject.lookupId);
      if (joined && !e.parentProject.title) e.parentProject.title = joined;
    }
  }
  return eirs;
}

// ---- helpers ---------------------------------------------------------------

/**
 * Read the EIR's project-reference from a graph fields bag.
 *
 * This column has been a moving target across tenants and provisioning
 * methods: sometimes it comes back as `ProjectReferenceLookupId` (proper
 * lookup column, lookup id available), sometimes as bare `ProjectReference`
 * with a string value (text or managed-metadata column), sometimes as an
 * empty `{}` (unexpanded lookup). We accept ALL of those and prefer
 * whatever we can extract — a lookup id (which lets us join titles from
 * the projects catalogue), a free-text title (which we display directly),
 * or both.
 */
function readProjectLookupId(
  f: Record<string, unknown>,
): { lookupId: number; title: string } | null {
  let bestId = 0;
  let bestTitle = "";
  for (const [key, raw] of Object.entries(f)) {
    if (!/project/i.test(key)) continue;
    if (!/reference/i.test(key) && !key.endsWith("LookupId")) continue;
    const { id, title } = extractLookupHints(raw);
    if (id != null && bestId === 0) bestId = id;
    if (title && !bestTitle) bestTitle = title;
  }
  if (bestId === 0 && !bestTitle) return null;
  // Use lookupId=0 as a "title-only" sentinel — attachEirReferences sees
  // 0 and skips the join (no real project has id 0 in SharePoint).
  return { lookupId: bestId, title: bestTitle };
}

/**
 * Pull whatever useful info we can out of a single field value. Lookup id
 * goes to `.id`; any human-readable name (LookupValue, Label, Title,
 * bare string) goes to `.title`.
 */
function extractLookupHints(raw: unknown): { id: number | null; title: string } {
  if (raw == null || raw === "" || raw === 0 || raw === "0") {
    return { id: null, title: "" };
  }
  if (typeof raw === "number") {
    return { id: raw > 0 ? raw : null, title: "" };
  }
  if (typeof raw === "string") {
    // Could be a numeric lookup id ("412") OR a free-text project name
    // ("2026-Cat Pyrometer, 133-6333"). Try numeric parse; if it consumes
    // the WHOLE string we treat it as an id, otherwise as a title.
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && String(n) === raw.trim()) {
      return { id: n > 0 ? n : null, title: "" };
    }
    return { id: null, title: raw };
  }
  if (Array.isArray(raw)) {
    // Multi-value lookup — take the first element.
    return raw.length > 0
      ? extractLookupHints(raw[0])
      : { id: null, title: "" };
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    let id: number | null = null;
    for (const k of ["LookupId", "lookupId", "Id", "id", "WssId"] as const) {
      const v = obj[k];
      if (typeof v === "number" && v > 0) {
        id = v;
        break;
      }
      if (typeof v === "string") {
        const n = parseInt(v, 10);
        if (!Number.isNaN(n) && n > 0) {
          id = n;
          break;
        }
      }
    }
    let title = "";
    for (const k of ["LookupValue", "Label", "Title", "DisplayName", "title"] as const) {
      const v = obj[k];
      if (typeof v === "string" && v) {
        title = v;
        break;
      }
    }
    return { id, title };
  }
  return { id: null, title: "" };
}

function clampRequired<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (typeof raw === "string" && (allowed as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return fallback;
}

function clampOptional<T extends string>(
  raw: unknown,
  allowed: readonly T[],
): T | null {
  if (typeof raw === "string" && (allowed as readonly string[]).includes(raw)) {
    return raw as T;
  }
  return null;
}

function parseDate(raw: unknown): Date | null {
  if (!raw || typeof raw !== "string") return null;
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

function parseNullableNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

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

function parsePersonMulti(raw: unknown): Person[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : [raw];
  const people: Person[] = [];
  for (const entry of items) {
    if (typeof entry !== "object" || entry === null) continue;
    const obj = entry as Record<string, unknown>;
    const displayName =
      (obj.LookupValue as string) ?? (obj.displayName as string) ?? (obj.title as string);
    if (!displayName) continue;
    people.push({
      displayName,
      email: (obj.Email as string) ?? (obj.email as string),
      lookupId: toInt(obj.LookupId ?? obj.lookupId, 0),
    });
  }
  return people;
}

function parseCreatedByUser(
  createdBy: { user?: { displayName?: string; email?: string } } | undefined,
): Person | null {
  const user = createdBy?.user;
  if (!user || !user.displayName) return null;
  return { displayName: user.displayName, email: user.email };
}
