import { Plus, X } from "lucide-react";
import type { Person } from "@/types/task";

interface PersonMultiFieldProps {
  /** Currently-selected people. Rendered as removable pills. */
  value: Person[];
  /** Full directory of pickable people. Anyone not in `value` shows up as a `+ Add` chip. */
  allPeople: Person[];
  /** Called on add OR remove with the toggled person — caller decides how to merge. */
  onToggle: (p: Person) => void;
  /** Copy shown when `value` is empty. Defaults to "Unassigned". */
  emptyLabel?: string;
}

/**
 * Pill-style person picker. Selected people render as chips with an X to
 * remove; an optional "+ Add person" expander lists the remaining directory.
 *
 * Used by the Task detail's Assigned field and the EIR detail's Assigned
 * Engineers field — both want the same shape, so the component lives here
 * to keep them aligned.
 */
export function PersonMultiField({
  value,
  allPeople,
  onToggle,
  emptyLabel = "Unassigned",
}: PersonMultiFieldProps) {
  const selectedKeys = new Set(
    value.map((p) => (p.email ?? p.displayName).toLowerCase()),
  );
  const unselected = allPeople.filter(
    (p) => !selectedKeys.has((p.email ?? p.displayName).toLowerCase()),
  );

  return (
    <div>
      {value.length === 0 ? (
        <div className="text-sm text-fg-muted">{emptyLabel}</div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {value.map((p) => (
            <span
              key={p.email ?? p.displayName}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs text-fg"
            >
              {p.displayName}
              <button
                onClick={() => onToggle(p)}
                className="rounded p-0.5 text-fg-muted hover:bg-surface hover:text-fg"
                aria-label={`Remove ${p.displayName}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      {unselected.length > 0 && (
        <details className="mt-1.5 text-xs">
          <summary className="cursor-pointer text-fg-muted hover:text-fg">+ Add person</summary>
          <div className="mt-1 flex flex-wrap gap-1">
            {unselected.map((p) => (
              <button
                key={p.email ?? p.displayName}
                onClick={() => onToggle(p)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-fg-muted hover:border-fg-muted hover:text-fg"
              >
                <Plus className="h-2.5 w-2.5" />
                {p.displayName}
              </button>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
