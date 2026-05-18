import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Person, ProjectReference } from "@/types/task";
import { cn } from "@/lib/cn";

export interface Filters {
  search: string;
  /** Selected project lookup IDs. Empty array = all projects. */
  projectIds: number[];
  /** Selected assignee emails (or displayNames as a fallback). Empty = anyone. */
  assignedEmails: string[];
  createdByEmail: string | null;
}

export const EMPTY_FILTERS: Filters = {
  search: "",
  projectIds: [],
  assignedEmails: [],
  createdByEmail: null,
};

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  projects: ProjectReference[];
  people: Person[]; // deduplicated set of people who appear on any task
}

export function FilterBar({ filters, onChange, projects, people }: FilterBarProps) {
  const peopleSorted = [...people].sort((a, b) => a.displayName.localeCompare(b.displayName));

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      <Field label="Project Reference">
        <MultiSelect
          allLabel="All projects"
          options={projects.map((p) => ({ value: String(p.lookupId), label: p.title }))}
          selected={filters.projectIds.map(String)}
          onChange={(next) =>
            onChange({
              ...filters,
              projectIds: next.map((v) => parseInt(v, 10)).filter((n) => !Number.isNaN(n)),
            })
          }
        />
      </Field>

      <Field label="Assigned">
        <MultiSelect
          allLabel="Anyone"
          options={peopleSorted.map((p) => ({
            value: p.email ?? p.displayName,
            label: p.displayName,
          }))}
          selected={filters.assignedEmails}
          onChange={(next) => onChange({ ...filters, assignedEmails: next })}
        />
      </Field>

      <Field label="Search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Title, description, comments…"
            className="select"
            style={{ paddingLeft: "2.25rem" }}
          />
        </div>
      </Field>

      <Field label="Created By">
        <select
          value={filters.createdByEmail ?? ""}
          onChange={(e) => onChange({ ...filters, createdByEmail: e.target.value || null })}
          className="select"
        >
          <option value="">Anyone</option>
          {peopleSorted.map((p) => (
            <option key={p.email ?? p.displayName} value={p.email ?? p.displayName}>
              {p.displayName}
            </option>
          ))}
        </select>
      </Field>

      <style>{`
        .select {
          width: 100%;
          height: 38px;
          padding: 0 0.75rem;
          background: rgb(var(--surface));
          color: rgb(var(--fg));
          border: 1px solid rgb(var(--border));
          border-radius: 8px;
          /* 16px on mobile prevents iOS Safari from auto-zooming when an
             input gets focus; smaller on tablet+ for visual density. */
          font-size: 16px;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        @media (min-width: 640px) {
          .select { font-size: 0.875rem; }
        }
        .select:focus {
          outline: none;
          border-color: rgb(var(--accent));
          box-shadow: 0 0 0 3px rgb(var(--accent) / 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  /** Text shown on the button when nothing is selected (e.g. "All projects"). */
  allLabel: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}

/**
 * Single-line trigger with a popover panel of checkboxes. The trigger
 * mirrors the native `<select>` styling (the `.select` class) so the four
 * filter cells look consistent.
 *
 * Closed: shows "All projects" when nothing is selected, the single label
 * when one is selected, or "<first> +N" when multiple are.
 */
function MultiSelect({ allLabel, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the panel on outside click / Escape so the popover doesn't feel
  // sticky. The Escape branch lives on the document to catch the key even
  // if focus has wandered out of the checkbox list.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedSet = new Set(selected);
  const selectedOptions = options.filter((o) => selectedSet.has(o.value));

  let summary: string;
  if (selectedOptions.length === 0) summary = allLabel;
  else if (selectedOptions.length === 1) summary = selectedOptions[0].label;
  else summary = `${selectedOptions[0].label} +${selectedOptions.length - 1}`;

  function toggle(value: string) {
    if (selectedSet.has(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="select flex items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn("truncate", selectedOptions.length === 0 && "text-fg-muted")}>
          {summary}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {selectedOptions.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="rounded-full p-0.5 text-fg-muted hover:bg-surface-2 hover:text-fg"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn("h-4 w-4 text-fg-muted transition-transform", open && "rotate-180")}
          />
        </div>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-fg-muted">No options</div>
          ) : (
            options.map((o) => {
              const isSelected = selectedSet.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    isSelected ? "bg-accent/10 text-fg" : "text-fg hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      isSelected ? "border-accent bg-accent text-white" : "border-border bg-surface",
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
