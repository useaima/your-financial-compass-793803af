import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
