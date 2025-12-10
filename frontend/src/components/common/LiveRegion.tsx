import { useEffect, useState } from "react";

interface LiveRegionProps {
  message: string;
  politeness?: "polite" | "assertive" | "off";
  clearAfter?: number;
}

/**
 * LiveRegion - ARIA live region for screen reader announcements
 *
 * This component provides accessibility announcements for dynamic content changes
 * that sighted users see visually (like toasts) but screen reader users need to hear.
 *
 * @param message - The text to announce to screen readers
 * @param politeness - How urgently to announce: "polite" (default), "assertive", or "off"
 * @param clearAfter - Clear message after X milliseconds (default: 5000)
 */
export function LiveRegion({
  message,
  politeness = "polite",
  clearAfter = 5000
}: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState(message);

  useEffect(() => {
    if (message) {
      setCurrentMessage(message);

      if (clearAfter > 0) {
        const timer = setTimeout(() => {
          setCurrentMessage("");
        }, clearAfter);

        return () => clearTimeout(timer);
      }
    }
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
}
