import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import {
  useTaskColumns,
  useTaskRawFields,
  useUpdateTaskFields,
} from "@/hooks/useTasks";
import { resolvePcbChecklist, type ResolvedChecklistItem } from "@/lib/pcbChecklist";
import type { Task } from "@/types/task";

interface PcbChecklistCardProps {
  task: Task;
}

/**
 * "PCB Checklist" card — rendered inline on the main column of the task
 * detail view only when `task.category === "PCB"`. Mirrors the layout
 * from the original Power Apps form: two columns of Yes/No checkboxes
 * with the Choice fields' radio groups slotted into the appropriate
 * column.
 *
 * Reads the raw SharePoint field bag (via `useTaskRawFields`) and the
 * Task list's column metadata (via `useTaskColumns`); display-name →
 * internal-name resolution happens inside `resolvePcbChecklist` so we
 * don't have to guess the wild SP encoding rules.
 *
 * Writes are optimistic via the existing `useUpdateTaskFields` hook +
 * a small local optimistic patch into the raw-fields cache so the
 * checkbox flips instantly without waiting for Graph.
 */
export function PcbChecklistCard({ task }: PcbChecklistCardProps) {
  const qc = useQueryClient();
  const { data: spColumns = [], isLoading: columnsLoading } = useTaskColumns();
  const { data: rawFields = {}, isLoading: fieldsLoading } = useTaskRawFields(task.id);
  const updateFields = useUpdateTaskFields();

  const items = useMemo(() => resolvePcbChecklist(spColumns), [spColumns]);
  const leftColumn = items.filter((it) => it.column === "left");
  const rightColumn = items.filter((it) => it.column === "right");

  function toggleBoolean(item: ResolvedChecklistItem, next: boolean) {
    const col = item.spColumn;
    if (!col) return;
    // Optimistically patch the raw-fields cache so the UI reflects the
    // new state immediately. The actual Graph call follows; on error,
    // `useUpdateTaskFields` rolls back the typed-task cache and shows a
    // toast — we also revert the raw-fields cache here.
    const prev = rawFields[col.name];
    qc.setQueryData<Record<string, unknown>>(["task-raw-fields", task.id], {
      ...rawFields,
      [col.name]: next,
    });
    updateFields.mutate(
      { id: task.id, fields: { [col.name]: next } },
      {
        onError: () => {
          qc.setQueryData<Record<string, unknown>>(["task-raw-fields", task.id], {
            ...rawFields,
            [col.name]: prev,
          });
        },
      },
    );
  }

  function setChoice(item: ResolvedChecklistItem, next: string | null) {
    const col = item.spColumn;
    if (!col) return;
    const prev = rawFields[col.name];
    qc.setQueryData<Record<string, unknown>>(["task-raw-fields", task.id], {
      ...rawFields,
      [col.name]: next,
    });
    updateFields.mutate(
      { id: task.id, fields: { [col.name]: next } },
      {
        onError: () => {
          qc.setQueryData<Record<string, unknown>>(["task-raw-fields", task.id], {
            ...rawFields,
            [col.name]: prev,
          });
        },
      },
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-fg-muted">
        <ClipboardCheck className="h-4 w-4" />
        Checklist
        <ChecklistProgress items={items} rawFields={rawFields} />
      </h2>

      {columnsLoading || fieldsLoading ? (
        <div className="py-4 text-center text-xs text-fg-muted">Loading checklist…</div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
          <ChecklistColumn
            items={leftColumn}
            rawFields={rawFields}
            onToggleBoolean={toggleBoolean}
            onSetChoice={setChoice}
          />
          <ChecklistColumn
            items={rightColumn}
            rawFields={rawFields}
            onToggleBoolean={toggleBoolean}
            onSetChoice={setChoice}
          />
        </div>
      )}
    </div>
  );
}

function ChecklistProgress({
  items,
  rawFields,
}: {
  items: ResolvedChecklistItem[];
  rawFields: Record<string, unknown>;
}) {
  let done = 0;
  let total = 0;
  for (const it of items) {
    if (!it.spColumn) continue;
    total++;
    const v = rawFields[it.spColumn.name];
    if (it.kind === "boolean" && v === true) done++;
    if (it.kind === "choice" && typeof v === "string" && v) done++;
  }
  if (total === 0) return null;
  return (
    <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold tabular-nums text-fg">
      {done}/{total}
    </span>
  );
}

function ChecklistColumn({
  items,
  rawFields,
  onToggleBoolean,
  onSetChoice,
}: {
  items: ResolvedChecklistItem[];
  rawFields: Record<string, unknown>;
  onToggleBoolean: (item: ResolvedChecklistItem, next: boolean) => void;
  onSetChoice: (item: ResolvedChecklistItem, next: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <ChecklistRow
          key={it.displayName}
          item={it}
          rawFields={rawFields}
          onToggleBoolean={onToggleBoolean}
          onSetChoice={onSetChoice}
        />
      ))}
    </div>
  );
}

function ChecklistRow({
  item,
  rawFields,
  onToggleBoolean,
  onSetChoice,
}: {
  item: ResolvedChecklistItem;
  rawFields: Record<string, unknown>;
  onToggleBoolean: (item: ResolvedChecklistItem, next: boolean) => void;
  onSetChoice: (item: ResolvedChecklistItem, next: string | null) => void;
}) {
  if (!item.spColumn) {
    return (
      <div className="rounded-md border border-dashed border-cooper-red/30 px-2 py-1.5 text-[11px] text-cooper-red">
        <strong>{item.displayName}</strong>
        <div className="text-fg-muted">
          column missing on the SharePoint Task list — skipped
        </div>
      </div>
    );
  }
  if (item.kind === "boolean") {
    const checked = rawFields[item.spColumn.name] === true;
    return (
      <label className="flex cursor-pointer items-start gap-2 text-sm leading-snug">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggleBoolean(item, e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
        />
        <span className={checked ? "text-fg" : "text-fg"}>{item.displayName}</span>
      </label>
    );
  }
  // choice
  const current = rawFields[item.spColumn.name];
  const currentStr = typeof current === "string" ? current : "";
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-sm font-medium text-fg">{item.displayName}</div>
      <div className="flex flex-col gap-1 pl-1">
        {item.spColumn.choices.map((choice) => {
          const id = `${item.spColumn?.name}-${choice}`;
          return (
            <label
              key={choice}
              htmlFor={id}
              className="flex cursor-pointer items-start gap-2 text-sm leading-snug text-fg-muted"
            >
              <input
                id={id}
                type="radio"
                name={item.spColumn?.name}
                value={choice}
                checked={currentStr === choice}
                onChange={() => onSetChoice(item, choice)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
              />
              <span>{choice}</span>
            </label>
          );
        })}
        {currentStr && (
          <button
            type="button"
            onClick={() => onSetChoice(item, null)}
            className="self-start text-[11px] text-fg-muted underline-offset-2 hover:underline"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
