import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initMonitoring } from "./lib/monitoring";
import "./index.css";

async function clearLegacyPwaRuntime() {
  if (typeof window === "undefined") return;

  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((registrations ?? []).map((registration) => registration.unregister()));
  } catch {
    // Legacy cleanup is best-effort and should never block app startup.
  }

  try {
    const keys = await window.caches?.keys?.();
    const legacyKeys = (keys ?? []).filter((key) =>
      /workbox|precache|runtime|supabase-api|eva/i.test(key),
    );
    await Promise.all(legacyKeys.map((key) => window.caches.delete(key)));
  } catch {
    // Cache cleanup is best-effort and should never block app startup.
  }
}

void clearLegacyPwaRuntime();

createRoot(document.getElementById("root")!).render(<App />);
initMonitoring();
