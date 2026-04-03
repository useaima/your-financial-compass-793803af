import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Disable hosted service workers to avoid stale cached shells on deploys.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isLocalHost =
  ["localhost", "127.0.0.1"].includes(window.location.hostname) ||
  window.location.hostname.endsWith(".local");

if (isInIframe || !isLocalHost) {
  window.addEventListener("load", () => {
    navigator.serviceWorker?.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

    window.caches?.keys?.().then((keys) => {
      keys.forEach((key) => {
        void window.caches.delete(key);
      });
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
