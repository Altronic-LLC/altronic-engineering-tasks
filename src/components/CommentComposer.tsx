import { Paperclip, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import type { CommentAttachment } from "@/types/task";
import { cn } from "@/lib/cn";

interface CommentComposerProps {
  onSubmit: (
    bodyHtml: string,
    attachments: CommentAttachment[],
  ) => void | Promise<void>;
  disabled?: boolean;
}

/**
 * Plain-text composer with file/image attachments. Wraps each text paragraph
 * in <p> tags before sending. Attachments are captured as CommentAttachment[]
 * with blob URLs for in-session preview.
 *
 * In demo mode, attachments live in memory only — they vanish on refresh.
 * In real mode (once wired up), they'll be uploaded to a SharePoint document
 * library before the comment is posted. The upload step belongs in
 * src/api/tasks.ts addComment(), not here.
 */
export function CommentComposer({ onSubmit, disabled }: CommentComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<CommentAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    setBusy(true);
    try {
      const html = trimmed
        ? trimmed
            .split(/\n{2,}/)
            .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
            .join("")
        : "";
      await onSubmit(html, attachments);
      setText("");
      // Don't revoke the object URLs here — the parent will keep them on
      // the new comment record so the preview still works after submit.
      // The objectUrls are revoked on page unload by the browser.
      setAttachments([]);
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
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !busy;

  return (
    <div
      className={cn(
        "rounded-lg border bg-surface p-3 transition-colors",
        isDragging ? "border-accent bg-accent/5" : "border-border",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isDragging ? "Drop files here…" : "Write a comment… (drop files or click attach below)"}
        disabled={disabled || busy}
        rows={4}
        className="w-full resize-y rounded-md bg-bg p-3 text-base text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-accent/30 sm:text-sm"
      />

      {/* Attachment previews. Shown above the action row so they're prominent.
          Images get a thumbnail; non-image files get a generic chip. */}
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
              // Reset so the same file can be re-selected
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
