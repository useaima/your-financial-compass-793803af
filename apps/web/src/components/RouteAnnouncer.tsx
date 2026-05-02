import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Announces route changes to screen readers via an aria-live region.
 * Invisible to sighted users but essential for navigation awareness.
 */
export default function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Small delay so the page title / heading has time to update
    const timer = window.setTimeout(() => {
      const heading = document.querySelector("h1");
      const pageTitle = heading?.textContent ?? document.title ?? "Page";
      setAnnouncement(`Navigated to ${pageTitle}`);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
