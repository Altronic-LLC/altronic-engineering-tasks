import { AtSign, Paperclip, Send, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CommentAttachment, Person } from "@/types/task";
import { buildCommentHtml } from "@/lib/mentions";
import { cn } from "@/lib/cn";

interface CommentComposerProps {
  onSubmit: (
    bodyHtml: string,
    attachments: CommentAttachment[],
  ) => void | Promise<void>;
  disabled?: boolean;
  /**
   * People available for @-mentions. Typically the collected set of
   * assignees + watchers across tasks, plus the current user. Composer
   * shows them in a popup when the user types `@`.
   */
  mentionablePeople?: Person[];
}

/**
 * Plain-text composer with file/image attachments and @-mention support.
 * Wraps each text paragraph in <p> tags before sending. Mentions picked
 * from the popup are persisted as <span class="mention" data-email="...">
 * via the buildCommentHtml() helper so the email-notification path can
 * later extract who to mail.
 */
export function CommentComposer({
  onSubmit,
  disabled,
  mentionablePeople = [],
}: CommentComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<CommentAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Picked mentions stay in their own array so we know which `@Name`
  // substrings to convert to chips at submit time. Users can manually
  // type "@foo" and it stays plain text — only chosen mentions become chips.
  const [mentions, setMentions] = useState<Person[]>([]);

  // Mention popup state: the open boolean plus what the user has typed
  // after the `@`. We compute candidates from mentionablePeople filtered
  // by the query. activeIndex tracks the keyboard-highlighted candidate.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // Position of the @ in the current text — used to replace it with the
  // chosen name when the user selects from the popup.
  const atPosRef = useRef<number | null>(null);

  function addFiles(files: FileList | File[]) {
    const newOnes: CommentAttachment[] = [];
    for (const file of Array.from(files)) {
      newOnes.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        objectUrl: URL.createObjectURL(file),
      });
    }
    setAttachments((prev) => [...prev, ...newOnes]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id);
      if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl);
      return prev.filter((a) => a.id !== id);
    });
  }

  // People filtered by the user's query after the @ — first-letter and
  // substring matches both count, scored slightly higher for prefix.
  const candidates = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!pickerOpen) return [];
    const matches = mentionablePeople
      .filter((p) => p.displayName.toLowerCase().includes(q))
      .sort((a, b) => {
        const ap = a.displayName.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.displayName.toLowerCase().startsWith(q) ? 0 : 1;
        return ap - bp || a.displayName.localeCompare(b.displayName);
      });
    return matches.slice(0, 6);
  }, [mentionablePeople, pickerQuery, pickerOpen]);

  // Keep activeIndex in range when candidates change.
  useEffect(() => {
    if (activeIndex >= candidates.length) setActiveIndex(0);
  }, [candidates.length, activeIndex]);

  /**
   * Inspect the text up to the caret and decide whether the user is
   * actively typing a mention (i.e. they typed `@` recently and haven't
   * passed a space yet). If yes, open the picker and capture the query.
   */
  function detectMention(nextText: string, caret: number) {
    // Walk backwards from caret to find a `@` not preceded by a word char.
    let i = caret - 1;
    while (i >= 0) {
      const ch = nextText[i];
      if (ch === "@") {
        const before = i > 0 ? nextText[i - 1] : "";
        // Require the @ to be at start, or preceded by whitespace/punctuation
        if (before === "" || /[\s(\[]/.test(before)) {
          const query = nextText.slice(i + 1, caret);
          if (!/\s/.test(query)) {
            atPosRef.current = i;
            setPickerQuery(query);
            setPickerOpen(true);
            return;
          }
        }
        break;
      }
      if (/\s/.test(ch)) break;
      i--;
    }
    setPickerOpen(false);
    atPosRef.current = null;
  }

  function handleTextChange(next: string) {
    setText(next);
    const caret = textareaRef.current?.selectionStart ?? next.length;
    detectMention(next, caret);
  }

  function pickMention(person: Person) {
    const at = atPosRef.current;
    if (at == null) return;
    const caret = textareaRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, at);
    const after = text.slice(caret);
    // Insert "@Display Name " (with trailing space) so the user can keep
    // typing right after the chip without having to add it themselves.
    const inserted = `@${person.displayName} `;
    const nextText = before + inserted + after;
    setText(nextText);
    setMentions((prev) => {
      const key = (person.email ?? person.displayName).toLowerCase();
      const has = prev.some(
        (p) => (p.email ?? p.displayName).toLowerCase() === key,
      );
      return has ? prev : [...prev, person];
    });
    setPickerOpen(false);
    atPosRef.current = null;
    // Restore caret right after the inserted name.
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = before.length + inserted.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    setBusy(true);
    try {
      const html = trimmed ? buildCommentHtml(trimmed, mentions) : "";
      await onSubmit(html, attachments);
      setText("");
      setAttachments([]);
      setMentions([]);
    } finally {
      setBusy(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (pickerOpen && candidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % candidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        pickMention(candidates[activeIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPickerOpen(false);
        atPosRef.current = null;
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !busy;

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-surface p-3 transition-colors",
        isDragging ? "border-accent bg-accent/5" : "border-border",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onSelect={() => {
          const ta = textareaRef.current;
          if (!ta) return;
          detectMention(text, ta.selectionStart);
        }}
        onKeyDown={handleKeyDown}
        placeholder={
          isDragging
            ? "Drop files here…"
            : "Write a comment… (type @ to mention someone, drop files to attach)"
        }
        disabled={disabled || busy}
        rows={4}
        className="w-full resize-y rounded-md bg-bg p-3 text-base text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/30 sm:text-sm"
      />

      {pickerOpen && candidates.length > 0 && (
        <div className="absolute left-3 right-3 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-lg sm:max-w-xs">
          {candidates.map((p, idx) => (
            <button
              key={p.email ?? p.displayName}
              type="button"
              onMouseDown={(e) => {
                // Use mousedown not click so the textarea doesn't lose focus
                // before we read selection state.
                e.preventDefault();
                pickMention(p);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                idx === activeIndex ? "bg-accent/10 text-fg" : "text-fg hover:bg-surface-2",
              )}
            >
              <AtSign className="h-3.5 w-3.5 text-fg-muted" />
              <span className="truncate font-medium">{p.displayName}</span>
              {p.email && (
                <span className="truncate text-xs text-fg-muted">{p.email}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachments.map((a) => (
            <AttachmentChip key={a.id} attachment={a} onRemove={() => removeAttachment(a.id)} />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-50"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach
          </button>
          {mentions.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
              <AtSign className="h-3 w-3" />
              {mentions.length} mention{mentions.length === 1 ? "" : "s"}
            </span>
          )}
          <span className="hidden text-xs text-fg-muted sm:inline">
            Press{" "}
            <kbd className="rounded border border-border bg-bg px-1 py-0.5 text-[10px]">Ctrl</kbd>+
            <kbd className="rounded border border-border bg-bg px-1 py-0.5 text-[10px]">Enter</kbd>{" "}
            to send
          </span>
        </div>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: CommentAttachment;
  onRemove: () => void;
}) {
  const isImage = attachment.contentType.startsWith("image/");

  return (
    <div className="relative flex items-center gap-2 rounded-md border border-border bg-surface-2 p-1.5 pr-7">
      {isImage && attachment.objectUrl ? (
        <img
          src={attachment.objectUrl}
          alt={attachment.filename}
          className="h-10 w-10 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface text-fg-muted">
          <Paperclip className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0 max-w-[160px] text-xs">
        <div className="truncate font-medium text-fg" title={attachment.filename}>
          {attachment.filename}
        </div>
        <div className="text-fg-muted">{formatBytes(attachment.sizeBytes)}</div>
      </div>
      <button
        onClick={onRemove}
        className="absolute right-1 top-1 rounded p-0.5 text-fg-muted transition-colors hover:bg-surface hover:text-fg"
        aria-label="Remove attachment"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
