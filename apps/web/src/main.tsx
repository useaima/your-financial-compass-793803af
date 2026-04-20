import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import { initMonitoring } from "./lib/monitoring";
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
} else if ("serviceWorker" in navigator) {
  registerSW({
    immediate: false,
    onRegisterError(error) {
      console.error("Service worker registration failed:", error);
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
initMonitoring();
