import { ArrowDown, ArrowLeft, BookOpen, ExternalLink, Info, Key } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CURRENT_VERSION } from "@/data/changelog";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { cn } from "@/lib/cn";

// =============================================================================
// About page — high-level system map.
//
// IMPORTANT: this page is the source of truth for "how does this app fit
// together." If you add a view, route, hook category, API surface, or
// SharePoint list, edit the data arrays below in the same commit.
//
// We used to render this with Mermaid; the parser kept tripping over any
// shape that mixed quotes, parens, or <br/> tags. Replaced with a hand-laid
// HTML + Tailwind layout — same information, easier to read, and zero
// chance of "syntax error in text" on the live page.
// =============================================================================

/**
 * Visual palette — kept in one place so colour stays consistent across both
 * diagrams. Each kind maps to a Tailwind class set (border + background +
 * text) tuned for both light and dark themes.
 */
const PALETTE = {
  ui: "border-cooper-red/40 bg-cooper-red/15 text-fg",
  auth: "border-superior-blue/40 bg-superior-blue/15 text-fg",
  gateway: "border-superior-blue/40 bg-superior-blue/10 text-fg",
  list: "border-cooper-green/40 bg-cooper-green/15 text-fg",
  mock: "border-border bg-surface-2 text-fg-muted",
  entity: "border-cooper-red/40 bg-cooper-red/15 text-fg",
  shared: "border-superior-blue/40 bg-superior-blue/15 text-fg",
} as const;

type PaletteKey = keyof typeof PALETTE;

interface NodeSpec {
  label: string;
  /** Optional second line — a short subtitle in muted text. */
  hint?: string;
  palette: PaletteKey;
}

// =============================================================================
// System flow tiers — top-down, browser at the top, SharePoint at the bottom.
// =============================================================================

interface Tier {
  label: string;
  nodes: NodeSpec[];
}

const SYSTEM_TIERS: Tier[] = [
  {
    label: "User",
    nodes: [{ label: "User in browser", hint: "altronic-llc.github.io", palette: "ui" }],
  },
  {
    label: "React SPA",
    nodes: [
      { label: "Views", hint: "Dashboard · List · Kanban · Detail · EIRs · Admin", palette: "ui" },
      { label: "React Query hooks", hint: "useTasks · useEirs · useAdmins · useAttachments", palette: "ui" },
      { label: "API layer", hint: "src/api/tasks · eirs · admins · attachments · email", palette: "ui" },
    ],
  },
  {
    label: "Auth & transport",
    nodes: [
      { label: "MSAL Entra ID", hint: "Sites.Selected · Mail.Send.Shared · AllSites.Manage", palette: "auth" },
      { label: "Microsoft Graph v1.0", hint: "Lists, items, users, mail", palette: "gateway" },
      { label: "SharePoint REST", hint: "Attachments only", palette: "gateway" },
      { label: "Mock store", hint: "in-memory + localStorage (demo mode)", palette: "mock" },
      { label: "Shared mailbox", hint: "@-mention notifications", palette: "mock" },
    ],
  },
  {
    label: "SharePoint lists",
    nodes: [
      { label: "Project Task List", palette: "list" },
      { label: "Projects", palette: "list" },
      { label: "Test Results", palette: "list" },
      { label: "EIRs", palette: "list" },
      { label: "Admins", palette: "list" },
    ],
  },
];

// =============================================================================
// Data model — ER-diagram style. Each entity is a table card with its key
// columns and the foreign keys called out (FK → Target). This is the
// schema view the engineering team asked for; the previous hierarchy
// layout undersold how the relationships actually wire up.
// =============================================================================

type ColumnKind = "pk" | "field" | "fk";

interface SchemaColumn {
  name: string;
  type: string;
  kind: ColumnKind;
  /** Where this FK points, e.g. "Project.id" or "Person.id[]". */
  references?: string;
}

interface SchemaTable {
  name: string;
  /** SharePoint list display name (or "Concept" for shared/derived ones). */
  source: string;
  palette: PaletteKey;
  columns: SchemaColumn[];
}

const SCHEMA_TABLES: SchemaTable[] = [
  {
    name: "Project",
    source: "Projects list",
    palette: "entity",
    columns: [
      { name: "id", type: "int", kind: "pk" },
      { name: "title", type: "text", kind: "field" },
    ],
  },
  {
    name: "Task",
    source: "Project Task List",
    palette: "entity",
    columns: [
      { name: "id", type: "int", kind: "pk" },
      { name: "title", type: "text", kind: "field" },
      { name: "numberedTitle", type: "text", kind: "field" },
      { name: "status", type: "choice", kind: "field" },
      { name: "priority", type: "choice", kind: "field" },
      { name: "category", type: "choice", kind: "field" },
      { name: "labels", type: "choice[]", kind: "field" },
      { name: "dueDate", type: "datetime", kind: "field" },
      { name: "parentProjectId", type: "int", kind: "fk", references: "Project.id" },
      { name: "parentTaskId", type: "int", kind: "fk", references: "Task.id" },
      { name: "relatedProjects", type: "int[]", kind: "fk", references: "Project.id" },
      { name: "assigned", type: "int[]", kind: "fk", references: "Person.id" },
      { name: "watchers", type: "int[]", kind: "fk", references: "Person.id" },
      { name: "description", type: "text", kind: "field" },
      { name: "communication", type: "text", kind: "field" },
    ],
  },
  {
    name: "EIR",
    source: "Engineering Information Request",
    palette: "entity",
    columns: [
      { name: "id", type: "int", kind: "pk" },
      { name: "eirNo", type: "text", kind: "field" },
      { name: "title", type: "text", kind: "field" },
      { name: "requestType", type: "choice", kind: "field" },
      { name: "status", type: "choice", kind: "field" },
      { name: "resolution", type: "choice", kind: "field" },
      { name: "requestedPriority", type: "choice", kind: "field" },
      { name: "projectReferences", type: "int[]", kind: "fk", references: "Project.id" },
      { name: "taskReference", type: "text", kind: "field" },
      { name: "reporter", type: "int", kind: "fk", references: "Person.id" },
      { name: "assignedEngineers", type: "int[]", kind: "fk", references: "Person.id" },
      { name: "watchers", type: "int[]", kind: "fk", references: "Person.id" },
      { name: "description", type: "text", kind: "field" },
      { name: "engineeringResponse", type: "text", kind: "field" },
      { name: "whereUsed", type: "text", kind: "field" },
      { name: "mfg / mfgPartNumber / altronicPartNumber", type: "text", kind: "field" },
      { name: "eau / currentStock / currentPrice", type: "text", kind: "field" },
      { name: "requestedCompletionDate / ltbDate", type: "datetime", kind: "field" },
      { name: "buyerCode", type: "text", kind: "field" },
      { name: "communication", type: "text", kind: "field" },
    ],
  },
  {
    name: "TestSheet",
    source: "Test Results",
    palette: "entity",
    columns: [
      { name: "id", type: "int", kind: "pk" },
      { name: "title", type: "text", kind: "field" },
      { name: "product / serialNumber / firmwareVersion", type: "text", kind: "field" },
      { name: "purpose / results", type: "text", kind: "field" },
      { name: "parentProjectId", type: "int", kind: "fk", references: "Project.id" },
      { name: "parentTaskId", type: "int", kind: "fk", references: "Task.id" },
      { name: "tester", type: "int", kind: "fk", references: "Person.id" },
    ],
  },
  {
    name: "Admin",
    source: "Admins list",
    palette: "entity",
    columns: [
      { name: "id", type: "int", kind: "pk" },
      { name: "email", type: "text", kind: "fk", references: "Person.email" },
      { name: "displayName", type: "text", kind: "field" },
      { name: "note", type: "text", kind: "field" },
    ],
  },
  {
    name: "Person",
    source: "Concept (resolved from SharePoint user info list)",
    palette: "shared",
    columns: [
      { name: "id", type: "int", kind: "pk" },
      { name: "displayName", type: "text", kind: "field" },
      { name: "email", type: "text", kind: "field" },
    ],
  },
  {
    name: "Comment",
    source: "Concept (parsed from Communication text field)",
    palette: "shared",
    columns: [
      { name: "parentId", type: "int", kind: "fk", references: "Task.id / EIR.id" },
      { name: "timestamp", type: "datetime", kind: "field" },
      { name: "authorName", type: "text", kind: "field" },
      { name: "authorEmail", type: "text", kind: "field" },
      { name: "bodyHtml", type: "text", kind: "field" },
    ],
  },
  {
    name: "Attachment",
    source: "Concept (SharePoint REST list-item file)",
    palette: "shared",
    columns: [
      { name: "parentId", type: "int", kind: "fk", references: "Task.id / EIR.id" },
      { name: "fileName", type: "text", kind: "field" },
      { name: "serverRelativeUrl", type: "text", kind: "field" },
    ],
  },
];

export function AboutView() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-4 sm:px-6 sm:py-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-6 rounded-lg border border-border bg-surface p-5">
        <div className="mb-2 flex items-center gap-2">
          <Info className="h-4 w-4 text-fg-muted" />
          <h1 className="font-display text-xl font-semibold text-fg sm:text-2xl">
            About this app
          </h1>
          <span className="ml-auto text-xs text-fg-muted">v{CURRENT_VERSION}</span>
        </div>
        <p className="text-sm leading-relaxed text-fg-muted">
          The Altronic Engineering Task System is a SharePoint-backed task
          tracker, kanban board, EIR log, and test-sheet log for the
          engineering team. It runs as a static React SPA on GitHub Pages,
          signs you in through Microsoft Entra ID, and reads/writes a handful
          of SharePoint lists via Microsoft Graph (plus the SharePoint REST
          API for list-item attachments).
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            to="/manual"
            className="inline-flex items-center gap-1 rounded-md border border-accent bg-accent/10 px-2 py-1 font-medium text-accent transition-colors hover:bg-accent/20"
          >
            <BookOpen className="h-3 w-3" /> User Manual
          </Link>
          <a
            href="https://coopermachineryservices.sharepoint.com/sites/Altronic_Engineering/Lists/Project%20Task%20List/AllItems.aspx"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-fg-muted hover:border-fg-muted hover:text-fg"
          >
            <ExternalLink className="h-3 w-3" /> Project Task List
          </a>
          <a
            href="https://coopermachineryservices.sharepoint.com/sites/Altronic_Engineering/Lists/Test%20Results/AllItems.aspx"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-fg-muted hover:border-fg-muted hover:text-fg"
          >
            <ExternalLink className="h-3 w-3" /> Test Results
          </a>
          <a
            href="https://coopermachineryservices.sharepoint.com/sites/Altronic_Engineering/Lists/EIREngineering%20Information%20Request/AllItems.aspx"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-fg-muted hover:border-fg-muted hover:text-fg"
          >
            <ExternalLink className="h-3 w-3" /> EIRs
          </a>
          {isAdmin && (
            <a
              href="https://coopermachineryservices.sharepoint.com/sites/Altronic_Engineering/Lists/Admins/AllItems.aspx"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-fg-muted hover:border-fg-muted hover:text-fg"
            >
              <ExternalLink className="h-3 w-3" /> Admins
            </a>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-fg-muted hover:border-fg-muted hover:text-fg"
          >
            Back to tasks
          </Link>
        </div>
      </div>

      <Section
        title="System flow"
        description="Top-down. A request starts in the browser, travels through the SPA's view → hook → API layers, then either short-circuits to the mock store (demo mode) or out to Graph / SharePoint REST. Tokens come from MSAL."
      >
        <div className="flex flex-col items-stretch gap-2">
          {SYSTEM_TIERS.map((tier, i) => (
            <div key={tier.label}>
              <TierBlock label={tier.label} nodes={tier.nodes} />
              {i < SYSTEM_TIERS.length - 1 && <TierArrow />}
            </div>
          ))}
        </div>
        <Legend
          items={[
            { palette: "ui", label: "SPA" },
            { palette: "auth", label: "Entra ID" },
            { palette: "gateway", label: "Graph / SP REST" },
            { palette: "list", label: "SharePoint list" },
            { palette: "mock", label: "Demo / mailbox" },
          ]}
        />
      </Section>

      <Section
        title="Data model"
        description="ER-diagram view of the SharePoint schema. Each card is one entity (a SharePoint list, or a derived concept). Primary keys are flagged PK; foreign keys carry an arrow with the target column they reference. Array types (int[]) indicate a multi-value relationship — these are SharePoint multi-value Lookup / multi-person columns."
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {SCHEMA_TABLES.map((t) => (
            <SchemaCard key={t.name} table={t} />
          ))}
        </div>
        <Legend
          items={[
            { palette: "entity", label: "Entity (SharePoint list)" },
            { palette: "shared", label: "Shared concept" },
          ]}
        />
      </Section>

      <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-2/40 p-4 text-xs text-fg-muted">
        <strong className="text-fg">For contributors:</strong> if you add a
        new view, route, hook category, API surface, or SharePoint list, edit
        the data arrays at the top of{" "}
        <code className="rounded bg-bg px-1 py-0.5">src/views/AboutView.tsx</code>{" "}
        in the same commit.
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <h2 className="font-display text-base font-semibold text-fg sm:text-lg">{title}</h2>
      <p className="mt-1 text-xs text-fg-muted">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function TierBlock({ label, nodes }: Tier) {
  return (
    <div className="rounded-md border border-border bg-bg p-3 sm:p-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-muted">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {nodes.map((n) => (
          <DiagramNode key={n.label} node={n} />
        ))}
      </div>
    </div>
  );
}

function TierArrow() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="h-4 w-4 text-fg-muted" />
    </div>
  );
}

function DiagramNode({
  node,
  className,
}: {
  node: NodeSpec;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 shadow-sm",
        PALETTE[node.palette],
        className,
      )}
    >
      <div className="text-sm font-semibold">{node.label}</div>
      {node.hint && <div className="mt-0.5 text-[11px] text-fg-muted">{node.hint}</div>}
    </div>
  );
}

/**
 * Three-tier reference hierarchy. Project at top → Task in the middle →
 * EIR + Test Sheet at the bottom. Between each tier we render a labelled
 * "reference bar" showing the exact SharePoint columns carrying the
 * relationship (and which source entity sets each one).
 *
 * Visual cue: every arrow points UPWARD because references in SharePoint
 * point at the parent (the child stores the lookup id).
 */
/**
 * ER-diagram-style table card. Header carries the table name + the
 * SharePoint list / concept it comes from; the body is a striped column
 * list with type, kind (PK / FK / field), and the FK target where
 * applicable.
 */
function SchemaCard({ table }: { table: SchemaTable }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-bg shadow-sm">
      <div
        className={cn(
          "border-b border-border px-3 py-2",
          PALETTE[table.palette],
        )}
      >
        <div className="font-display text-sm font-semibold uppercase tracking-wider">
          {table.name}
        </div>
        <div className="text-[10px] text-fg-muted">{table.source}</div>
      </div>
      <table className="w-full text-xs">
        <tbody>
          {table.columns.map((col, i) => (
            <tr
              key={col.name}
              className={cn(
                i % 2 === 0 ? "bg-surface" : "bg-surface-2/40",
                "border-b border-border last:border-b-0",
              )}
            >
              <td className="w-8 px-2 py-1 align-top">
                {col.kind === "pk" && (
                  <span
                    className="inline-flex items-center rounded bg-cooper-red/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-cooper-red"
                    title="Primary key"
                  >
                    <Key className="h-2.5 w-2.5" />
                  </span>
                )}
                {col.kind === "fk" && (
                  <span
                    className="inline-flex items-center rounded bg-superior-blue/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-superior-blue"
                    title="Foreign key"
                  >
                    FK
                  </span>
                )}
              </td>
              <td className="px-1 py-1 font-mono font-semibold text-fg align-top">
                {col.name}
              </td>
              <td className="px-1 py-1 font-mono text-[10px] text-fg-muted align-top">
                {col.type}
              </td>
              <td className="px-2 py-1 text-[11px] text-fg-muted align-top">
                {col.references && (
                  <span className="inline-flex items-center gap-1">
                    <span className="text-superior-blue">→</span>
                    <span className="font-mono">{col.references}</span>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Legend({
  items,
}: {
  items: { palette: PaletteKey; label: string }[];
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-[11px]">
      <span className="font-semibold uppercase tracking-wider text-fg-muted">
        Legend
      </span>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "inline-block h-3 w-3 rounded-sm border",
              PALETTE[it.palette],
            )}
          />
          <span className="text-fg-muted">{it.label}</span>
        </span>
      ))}
    </div>
  );
}
