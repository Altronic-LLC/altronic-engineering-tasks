import { useEffect, useId, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  /** Mermaid syntax (flowchart, erDiagram, etc.). */
  source: string;
  /** Mermaid theme name. Defaults to "default". */
  theme?: "default" | "dark" | "neutral" | "forest";
}

/**
 * Renders a Mermaid diagram from a string source. Lazy-loaded by the
 * AboutView so the ~150 KB mermaid bundle doesn't bloat the rest of the
 * app. `useId` gives each diagram a stable unique container id (mermaid
 * insists on rendering into an id-addressable element).
 */
export default function MermaidDiagram({ source, theme = "default" }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme,
      securityLevel: "loose",
      flowchart: { useMaxWidth: true, htmlLabels: true },
    });

    let cancelled = false;
    mermaid
      .render(`mermaid-${id}`, source)
      .then(({ svg }) => {
        if (cancelled) return;
        if (ref.current) ref.current.innerHTML = svg;
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id, source, theme]);

  if (error) {
    return (
      <div className="rounded-md border border-cooper-red/30 bg-cooper-red/10 p-3 text-xs text-cooper-red">
        Failed to render diagram: {error}
      </div>
    );
  }

  return <div ref={ref} className="mermaid-host" />;
}
