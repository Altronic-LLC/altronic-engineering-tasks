import { useEffect, useState } from "react";

// Tailwind's `sm` breakpoint is 640px. Anything narrower we treat as a
// phone for interaction purposes (drag disabled, touch-first layouts).
const PHONE_BREAKPOINT = 640;

/**
 * Returns true when the viewport is phone-width (< 640px).
 *
 * Re-evaluates on resize and orientationchange, so a tablet flipped to
 * portrait, a phone rotated to landscape, or a desktop window dragged
 * narrow all update correctly.
 *
 * SSR-safe: returns `false` on the server (we render desktop-first and
 * let the resize listener correct it on first paint).
 */
export function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < PHONE_BREAKPOINT;
  });

  useEffect(() => {
    function handleResize() {
      setIsPhone(window.innerWidth < PHONE_BREAKPOINT);
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  return isPhone;
}
