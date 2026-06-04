import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * A <textarea> that auto-grows to fit its content as the user types or pastes,
 * instead of scrolling inside a fixed box. The rendered height tracks
 * `scrollHeight`; pass a floor via inline `style={{ minHeight }}` (inline so it
 * wins over both Tailwind and the modals' `.input` class). Manual drag-resize
 * is disabled since the height is managed for you.
 *
 * Drop-in replacement for `<textarea>` — forwards the ref and passes through
 * every prop (value, onChange, onKeyDown, placeholder, disabled, rows, …).
 */
export const AutoGrowTextarea = forwardRef<HTMLTextAreaElement, Props>(
  function AutoGrowTextarea({ value, onChange, onInput, style, ...rest }, ref) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const setRef = useCallback(
      (el: HTMLTextAreaElement | null) => {
        innerRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) {
          (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        }
      },
      [ref],
    );

    const grow = useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      // Reset to auto first so the box can shrink as well as grow, then size
      // to the full content height (scrollHeight includes padding).
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, []);

    // Re-grow whenever the controlled value changes — covers paste, programmatic
    // edits, and opening the field pre-filled with existing content.
    useEffect(grow, [value, grow]);

    return (
      <textarea
        ref={setRef}
        value={value}
        onChange={(e) => {
          onChange?.(e);
          grow();
        }}
        onInput={(e) => {
          onInput?.(e);
          grow();
        }}
        style={{ overflow: "hidden", resize: "none", ...style }}
        {...rest}
      />
    );
  },
);
