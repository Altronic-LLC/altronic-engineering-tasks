import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  HardHat,
  ListChecks,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useProjects, useTasks } from "@/hooks/useTasks";
import { useEirs } from "@/hooks/useEirs";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { SingleSelect } from "@/components/SearchableSelect";
import { LoadingTasks } from "@/components/LoadingTasks";
import {
  EIR_STATUSES,
  STATUSES,
  type Eir,
  type EirStatus,
  type Status,
  type Task,
} from "@/types/task";
import { eirStatusColor, statusColor } from "@/components/atoms";
import { getMetricCount } from "@/data/dashboardMockData";
import { cn } from "@/lib/cn";

// =============================================================================
// Engineering Dashboard — landing page after sign-in. Big-number metric cards
// up top (My Tasks / EIRs / ECNs / Build Requests), and a status breakdown
// panel below. The breakdown panel is driven by the currently-selected card
// — clicking a Tasks card shows task statuses, clicking the EIR card shows
// EIR statuses. A Project Reference filter at the top scopes every number
// on the page.
// =============================================================================

type BreakdownMode = "tasks-mine" | "tasks-company" | "eirs-mine";

export function DashboardView() {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const { data: eirs = [] } = useEirs();
  const currentUser = useCurrentUser();
  const [projectId, setProjectId] = useState<number | null>(null);
  // Which card is "in focus" — drives the breakdown panel below.
  const [breakdownMode, setBreakdownMode] = useState<BreakdownMode>("tasks-mine");

  const myEmail = (currentUser.email ?? "").toLowerCase();

  // ----- TASKS -----
  const projectScopedTasks = useMemo<Task[]>(
    () =>
      tasks.filter((t) => projectId == null || t.parentProject?.lookupId === projectId),
    [tasks, projectId],
  );
  const allOpenTasks = useMemo(
    () => projectScopedTasks.filter((t) => t.status !== "Complete"),
    [projectScopedTasks],
  );
  const myOpenTasks = useMemo(
    () =>
      allOpenTasks.filter((t) =>
        t.assigned.some((p) => (p.email ?? "").toLowerCase() === myEmail),
      ),
    [allOpenTasks, myEmail],
  );

  // ----- EIRs -----
  // Project filter applies first, then "assigned to me" via assignedEngineers.
  const projectScopedEirs = useMemo<Eir[]>(
    () =>
      eirs.filter(
        (e) => projectId == null || e.parentProject?.lookupId === projectId,
      ),
    [eirs, projectId],
  );
  const myEirs = useMemo(
    () =>
      projectScopedEirs.filter((e) =>
        e.assignedEngineers.some((p) => (p.email ?? "").toLowerCase() === myEmail),
      ),
    [projectScopedEirs, myEmail],
  );

  // ----- Breakdown source -----
  const taskBreakdownSource = useMemo(() => {
    if (breakdownMode === "tasks-company") return projectScopedTasks;
    return projectScopedTasks.filter((t) =>
      t.assigned.some((p) => (p.email ?? "").toLowerCase() === myEmail),
    );
  }, [projectScopedTasks, breakdownMode, myEmail]);

  const byTaskStatus = useMemo(() => {
    const out: Record<Status, number> = {
      BACKLOG: 0,
      "SELECTED FOR DEVELOPMENT": 0,
      "In Progress": 0,
      "On Hold": 0,
      Blocked: 0,
      Complete: 0,
    };
    for (const t of taskBreakdownSource) out[t.status]++;
    return out;
  }, [taskBreakdownSource]);

  const byEirStatus = useMemo(() => {
    const out: Record<EirStatus, number> = {
      "Under Review": 0,
      "EIR Not Accepted": 0,
      "Response Accepted": 0,
      "Response Not Accepted": 0,
      Closed: 0,
    };
    for (const e of myEirs) out[e.status]++;
    return out;
  }, [myEirs]);

  const projectOptions = projects.map((p) => ({
    value: String(p.lookupId),
    label: p.title,
  }));

  // ----- Navigation helpers -----
  function tasksUrl({
    mine,
    status,
  }: {
    mine: boolean;
    status?: Status | "ALL_ACTIVE";
  }): string {
    const params = new URLSearchParams();
    if (projectId != null) params.set("project", String(projectId));
    if (mine && currentUser.email) params.set("assigned", currentUser.email);
    else params.set("assigned", "");
    if (status) params.set("status", status);
    return `/list?${params.toString()}`;
  }

  function eirsUrl({ status }: { status?: EirStatus } = {}): string {
    const params = new URLSearchParams();
    if (projectId != null) params.set("project", String(projectId));
    if (currentUser.email) params.set("engineer", currentUser.email);
    if (status) params.set("status", status);
    return `/eirs?${params.toString()}`;
  }

  if (isLoading) return <LoadingTasks noun="your dashboard" />;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-fg sm:text-2xl">
            <Sparkles className="h-5 w-5 text-accent" />
            Engineering Dashboard
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {greet(currentUser.displayName)} — here's what's on your plate.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
            Filter by Project
          </span>
          <SingleSelect
            allLabel="All projects"
            searchPlaceholder="Search projects…"
            options={projectOptions}
            selected={projectId != null ? String(projectId) : null}
            onChange={(v) => setProjectId(v ? parseInt(v, 10) : null)}
          />
        </div>
      </header>

      {/* Primary metric grid. Clicking My Tasks / EIRs / All Tasks pins that
          dataset to the breakdown panel below. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="My Open Tasks"
          value={myOpenTasks.length}
          icon={<ListChecks className="h-5 w-5" />}
          accent={breakdownMode === "tasks-mine" ? "accent" : "muted"}
          hint="Assigned to you and not Complete"
          actionText="Show in breakdown"
          active={breakdownMode === "tasks-mine"}
          onClick={() => setBreakdownMode("tasks-mine")}
        />
        <MetricCard
          label="My EIRs"
          value={myEirs.length}
          icon={<FileText className="h-5 w-5" />}
          accent={breakdownMode === "eirs-mine" ? "accent" : "muted"}
          hint="EIRs where you're an assigned engineer"
          actionText="Show in breakdown"
          active={breakdownMode === "eirs-mine"}
          onClick={() => setBreakdownMode("eirs-mine")}
        />
        <MockMetricCard
          label="ECNs"
          value={getMetricCount("ecn", projectId)}
          icon={<Wrench className="h-5 w-5" />}
          subtitle="Engineering Change Notices (total across the team)"
        />
        <MockMetricCard
          label="My Build Requests"
          value={getMetricCount("buildRequest", projectId)}
          icon={<HardHat className="h-5 w-5" />}
          subtitle="Open build / fabrication asks assigned to you"
        />
      </div>

      {/* All Open Tasks (team-wide) sits next to the status breakdown panel
          so the two team-level views are read together. */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <MetricCard
          label="All Open Tasks"
          value={allOpenTasks.length}
          icon={<ListChecks className="h-5 w-5" />}
          accent={breakdownMode === "tasks-company" ? "accent" : "muted"}
          hint="Active across the team"
          actionText="Show in breakdown"
          active={breakdownMode === "tasks-company"}
          onClick={() => setBreakdownMode("tasks-company")}
        />
        <div className="lg:col-span-2 rounded-lg border border-border bg-surface p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-fg-muted">
              <ClipboardCheck className="h-4 w-4" />
              {breakdownMode === "eirs-mine"
                ? "EIR status breakdown · Mine"
                : breakdownMode === "tasks-company"
                ? "Task status breakdown · Company"
                : "Task status breakdown · Mine"}
            </h2>
            <button
              onClick={() => {
                if (breakdownMode === "eirs-mine") navigate(eirsUrl());
                else navigate(tasksUrl({ mine: breakdownMode === "tasks-mine" }));
              }}
              className="text-xs text-accent underline-offset-2 hover:underline"
            >
              View list →
            </button>
          </div>
          {breakdownMode === "eirs-mine" ? (
            <EirStatusBars
              byStatus={byEirStatus}
              onClickStatus={(s) => navigate(eirsUrl({ status: s }))}
            />
          ) : (
            <StatusBars
              byStatus={byTaskStatus}
              onClickStatus={(s) =>
                navigate(
                  tasksUrl({
                    mine: breakdownMode === "tasks-mine",
                    status: s,
                  }),
                )
              }
            />
          )}
        </div>
      </div>

      <p className="text-center text-xs text-fg-muted">
        ECNs and Build Requests are mock counts — those SharePoint lists
        aren't wired up yet. The dashboard scaffolding is already in place,
        so adding them later is just swapping the mock data source for a
        hook.
      </p>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  hint: string;
  actionText: string;
  onClick: () => void;
  accent?: "accent" | "muted";
  active?: boolean;
}

function MetricCard({
  label,
  value,
  icon,
  hint,
  actionText,
  onClick,
  accent = "accent",
  active,
}: MetricCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col items-start gap-1 rounded-lg border bg-surface p-4 text-left transition-all hover:border-fg-muted hover:shadow-md sm:p-5",
        active ? "border-accent ring-2 ring-accent/30" : "border-border",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider",
          accent === "accent" ? "text-accent" : "text-fg-muted",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            accent === "accent" ? "bg-accent/10 text-accent" : "bg-surface-2 text-fg-muted",
          )}
        >
          {icon}
        </span>
        {label}
      </div>
      <div className="font-display text-4xl font-bold tabular-nums text-fg">{value}</div>
      <div className="text-xs text-fg-muted">{hint}</div>
      <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-80 transition-opacity group-hover:opacity-100">
        {actionText}
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function MockMetricCard({
  label,
  value,
  icon,
  subtitle,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  subtitle: string;
}) {
  return (
    <div className="relative flex flex-col items-start gap-1 rounded-lg border border-dashed border-border bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 text-fg-muted">
          {icon}
        </span>
        {label}
      </div>
      <div className="font-display text-4xl font-bold tabular-nums text-fg">{value}</div>
      <div className="text-xs text-fg-muted">{subtitle}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
        Mock data · list not yet wired up
      </div>
    </div>
  );
}

function StatusBars({
  byStatus,
  onClickStatus,
}: {
  byStatus: Record<Status, number>;
  onClickStatus: (s: Status) => void;
}) {
  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
  return (
    <div className="flex flex-col gap-2">
      {STATUSES.map((status) => {
        const n = byStatus[status];
        const pct = total > 0 ? (n / total) * 100 : 0;
        return (
          <button
            key={status}
            onClick={() => onClickStatus(status)}
            className="group flex items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-surface-2"
          >
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                statusColor(status),
              )}
            >
              {status}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent/70 transition-all group-hover:bg-accent"
                style={{ width: `${Math.max(pct, n > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-fg">
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EirStatusBars({
  byStatus,
  onClickStatus,
}: {
  byStatus: Record<EirStatus, number>;
  onClickStatus: (s: EirStatus) => void;
}) {
  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);
  return (
    <div className="flex flex-col gap-2">
      {EIR_STATUSES.map((status) => {
        const n = byStatus[status];
        const pct = total > 0 ? (n / total) * 100 : 0;
        return (
          <button
            key={status}
            onClick={() => onClickStatus(status)}
            className="group flex items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-surface-2"
          >
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                eirStatusColor(status),
              )}
            >
              {status}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-accent/70 transition-all group-hover:bg-accent"
                style={{ width: `${Math.max(pct, n > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-fg">
              {n}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function greet(name: string): string {
  if (!name) return "Welcome back";
  const first = name.split(" ")[0];
  const hr = new Date().getHours();
  const slot = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  return `${slot}, ${first}`;
}
