import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Info, Plus } from "lucide-react";
import { useSetStatus, useTasks } from "@/hooks/useTasks";
import { useIsPhone } from "@/hooks/useIsPhone";
import { STATUSES, type Status, type Task } from "@/types/task";
import { KanbanCard } from "@/components/KanbanCard";
import { TaskFormModal } from "@/components/TaskFormModal";
import { statusColor } from "@/components/atoms";
import { cn } from "@/lib/cn";

export function KanbanView() {
  const navigate = useNavigate();
  const { data: tasks = [], isLoading } = useTasks();
  const setStatus = useSetStatus();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const isPhone = useIsPhone();

  // PointerSensor (mouse/trackpad): 6px movement starts a drag.
  // TouchSensor (tablets): 200ms long-press, so normal touch-scrolling still works.
  //
  // On phones (<640px) the activation thresholds are bumped impossibly high
  // so drag is effectively off. Reason: dragging cards across a horizontally-
  // scrolling board on a small touch screen is fiddly; users get a smoother
  // experience tapping a card to open it and changing status from the detail
  // page's dropdown. We pass `dragDisabled` down to columns and cards too
  // so dnd-kit's per-item disabled flag handles it cleanly.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isPhone ? { distance: 999999 } : { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: isPhone
        ? { delay: 999999, tolerance: 0 }
        : { delay: 200, tolerance: 8 },
    }),
  );

  const tasksByStatus = useMemo(() => {
    const out: Record<Status, Task[]> = {
      BACKLOG: [],
      "SELECTED FOR DEVELOPMENT": [],
      "In Progress": [],
      "On Hold": [],
      Blocked: [],
      Complete: [],
    };
    for (const t of tasks) out[t.status].push(t);
    return out;
  }, [tasks]);

  function handleDragStart(event: DragStartEvent) {
    const t = tasks.find((x) => x.id === event.active.id);
    if (t) setActiveTask(t);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = Number(active.id);
    const task = tasks.find((x) => x.id === taskId);
    if (!task) return;

    // The droppable id is either a Status (column drop) or another task's id.
    let target: Status | null = null;
    if (STATUSES.includes(over.id as Status)) {
      target = over.id as Status;
    } else {
      const overTask = tasks.find((x) => x.id === Number(over.id));
      if (overTask) target = overTask.status;
    }

    if (target && target !== task.status) {
      setStatus.mutate({ id: task.id, status: target });
    }
  }

  if (isLoading) {
    return <div className="py-16 text-center text-fg-muted">Loading board…</div>;
  }

  return (
    <div className="mx-auto max-w-full px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-3 flex items-center justify-end">
        <button
          onClick={() => setShowNewTask(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Task</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Phone-only hint explaining why drag is off. Hidden on tablet/desktop
          since drag works normally there. */}
      {isPhone && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-border bg-surface-2/60 px-3 py-2 text-xs text-fg-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Tap a card to open it. Change status from the detail page — drag
            is available on tablet and desktop.
          </span>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="scroll-elegant flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => (
            <Column
              key={status}
              status={status}
              tasks={tasksByStatus[status]}
              onOpen={(id) => navigate(`/task/${id}`)}
              dragDisabled={isPhone}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <KanbanCard task={activeTask} onOpen={() => {}} dragDisabled={false} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {showNewTask && <TaskFormModal mode="create" onClose={() => setShowNewTask(false)} />}
    </div>
  );
}

interface ColumnProps {
  status: Status;
  tasks: Task[];
  onOpen: (id: number) => void;
  dragDisabled: boolean;
}

function Column({ status, tasks, onOpen, dragDisabled }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: dragDisabled });
  return (
    <div className="flex w-72 shrink-0 flex-col sm:w-80">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              statusColor(status),
            )}
          >
            {status}
          </span>
          <span className="text-xs text-fg-muted">{tasks.length}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "scroll-elegant flex min-h-[200px] flex-1 flex-col gap-2 overflow-y-auto rounded-lg border bg-surface-2/40 p-2 transition-colors",
          isOver ? "border-accent bg-accent/5" : "border-border",
        )}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <KanbanCard key={t.id} task={t} onOpen={onOpen} dragDisabled={dragDisabled} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-xs text-fg-muted">
            {dragDisabled ? "No tasks" : "Drop tasks here"}
          </div>
        )}
      </div>
    </div>
  );
}
