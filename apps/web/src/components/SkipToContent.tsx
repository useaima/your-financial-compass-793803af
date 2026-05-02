/**
 * Accessible skip-navigation link. Hidden by default, visible when focused via
 * keyboard (Tab). Jumps focus to the element with id="main-content".
 */
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-xl focus:bg-primary focus:px-6 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none"
    >
      Skip to main content
    </a>
  );
}
