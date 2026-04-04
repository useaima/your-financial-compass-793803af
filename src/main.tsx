import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import "./index.css";

Sentry.init({
  dsn: "https://5e04a086428c0c1bb2d1f9ac7cdd536b@o4511157792538624.ingest.us.sentry.io/4511157800468480",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const hostname = window.location.hostname;
const isPreviewHost = hostname.startsWith("id-preview--") || hostname.endsWith(".lovableproject.com");
const shouldDisableServiceWorker = isInIframe || isPreviewHost || !import.meta.env.PROD;

window.addEventListener("load", () => {
  if (shouldDisableServiceWorker) {
    navigator.serviceWorker?.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });

    window.caches?.keys?.().then((keys) => {
      keys.forEach((key) => {
        void window.caches.delete(key);
      });
    });

    return;
  }

  if (!("serviceWorker" in navigator)) {
    return;
  }

  void navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.error("Service worker registration failed:", error);
  });
});

createRoot(document.getElementById("root")!).render(<App />);
