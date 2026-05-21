import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, ExternalLink, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { CURRENT_VERSION } from "@/data/changelog";

// =============================================================================
// About page — high-level system map of the Altronic Engineering Task App.
//
// IMPORTANT: this page is the single source of truth for "how does this app
// fit together." If you add a view, a route, a hook category, an API surface,
// a SharePoint list, or any other structural piece, UPDATE THE DIAGRAMS
// below in the same commit. CLAUDE.md's "Architectural changes" section
// makes that a hard rule — don't let this page rot.
//
// Two diagrams:
//   1. systemDiagram — request flow: browser → views → hooks → API → Graph
//      → SharePoint lists, with the mock branch + auth path shown.
//   2. dataModelDiagram — entities (Task, Test Sheet, Project, Person) and
//      how they link to each other.
//
// Both are Mermaid syntax. Live edit at mermaid.live to preview before
// pasting back in.
// =============================================================================

const systemDiagram = `
flowchart TB
  User([User in browser])

  subgraph App [React SPA on GitHub Pages]
    direction TB
    Views[Views]
    Hooks[React Query hooks]
    Api[API layer]
    Views --> Hooks --> Api
  end

  User --> Views

  Msal[MSAL Entra ID]
  Mock[Mock store - localStorage]
  Graph[Microsoft Graph v1.0]
  SpRest[SharePoint REST]
  Mail[Shared mailbox]

  Api -- demo mode --> Mock
  Api -- live mode --> Graph
  Api -- attachments --> SpRest
  Api -- @-mentions --> Mail

  User -. sign in .-> Msal
  Msal -. Graph token .-> Graph
  Msal -. SP token .-> SpRest

  subgraph Sp [SharePoint lists]
    direction LR
    L1[Project Task List]
    L2[Projects]
    L3[Test Results]
    L4[EIRs]
    L5[Admins]
  end

  Graph --> Sp
  SpRest --> Sp

  classDef ui fill:#CB2C30,stroke:#fff,color:#fff,stroke-width:1px
  classDef auth fill:#7c3aed,stroke:#fff,color:#fff,stroke-width:1px
  classDef gateway fill:#1f6feb,stroke:#fff,color:#fff,stroke-width:1px
  classDef list fill:#0e7c0e,stroke:#fff,color:#fff,stroke-width:1px
  classDef mock fill:#6b7280,stroke:#fff,color:#fff,stroke-width:1px

  class User,Views,Hooks,Api ui
  class Msal auth
  class Graph,SpRest gateway
  class L1,L2,L3,L4,L5 list
  class Mock,Mail mock
`.trim();

const dataModelDiagram = `
flowchart LR
  Project[Project]
  Task[Task]
  TestSheet[Test Sheet]
  EIR[EIR]
  Admin[Admin]

  Task --> Project
  Task --> Task
  TestSheet --> Task
  TestSheet --> Project
  EIR --> Project
  EIR --> Task

  Person((Person))
  Comments[Comments]
  Files[Attachments]

  Task --> Person
  Task --> Comments
  Task -.-> Files
  TestSheet --> Person
  EIR --> Person
  EIR --> Comments
  EIR -.-> Files
  Admin --> Person

  classDef entity fill:#CB2C30,stroke:#fff,color:#fff,stroke-width:1px
  classDef shared fill:#1f6feb,stroke:#fff,color:#fff,stroke-width:1px

  class Project,Task,TestSheet,EIR,Admin entity
  class Person,Comments,Files shared
`.trim();

const Mermaid = lazy(() => import("../components/MermaidDiagram"));

export function AboutView() {
  const navigate = useNavigate();

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
          tracker, kanban board, and test-sheet log for the engineering team.
          It runs as a static React SPA on GitHub Pages, signs you in
          through Microsoft Entra ID, and reads/writes three SharePoint
          lists via the Microsoft Graph v1.0 API. The two diagrams below
          show how requests flow through the app and how the data on
          SharePoint links together.
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
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-fg-muted hover:border-fg-muted hover:text-fg"
          >
            Back to tasks
          </Link>
        </div>
      </div>

      <DiagramCard
        title="System flow"
        description="How a request travels from the browser to SharePoint. The mock branch shortcuts the network for demo mode; the real branch acquires a token via MSAL and hits Microsoft Graph."
        source={systemDiagram}
        cacheKey="about-system"
      />

      <DiagramCard
        title="Data model"
        description="The three SharePoint lists and how they reference one another. Lookups are written as `<Field>LookupId` for single values and use the @odata.type=Collection(Edm.Int32) shape for multi-value fields."
        source={dataModelDiagram}
        cacheKey="about-data-model"
      />

      <div className="mt-6 rounded-lg border border-dashed border-border bg-surface-2/40 p-4 text-xs text-fg-muted">
        <strong className="text-fg">For contributors:</strong> if you add a
        new view, route, hook category, API surface, or SharePoint list, edit
        the Mermaid sources at the top of{" "}
        <code className="rounded bg-bg px-1 py-0.5">src/views/AboutView.tsx</code>{" "}
        in the same commit. Preview your edits at{" "}
        <a
          href="https://mermaid.live/"
          target="_blank"
          rel="noreferrer"
          className="text-accent underline-offset-2 hover:underline"
        >
          mermaid.live
        </a>
        .
      </div>
    </div>
  );
}

interface DiagramCardProps {
  title: string;
  description: string;
  source: string;
  cacheKey: string;
}

function DiagramCard({ title, description, source, cacheKey }: DiagramCardProps) {
  const { theme } = useTheme();
  // Force re-render on theme change so Mermaid re-renders with the new
  // colors. Mermaid initialises once with a theme — keying remounts.
  const [renderKey, setRenderKey] = useState(0);
  useEffect(() => {
    setRenderKey((k) => k + 1);
  }, [theme]);

  return (
    <div className="mb-6 rounded-lg border border-border bg-surface p-4 sm:p-5">
      <h2 className="font-display text-base font-semibold text-fg sm:text-lg">{title}</h2>
      <p className="mt-1 text-xs text-fg-muted">{description}</p>
      <div className="mt-4 overflow-x-auto rounded-md border border-border bg-bg p-3">
        <Suspense
          fallback={<div className="py-8 text-center text-xs text-fg-muted">Loading diagram…</div>}
        >
          <Mermaid
            key={`${cacheKey}-${renderKey}`}
            source={source}
            theme={theme === "dark" ? "dark" : "default"}
          />
        </Suspense>
      </div>
    </div>
  );
}
