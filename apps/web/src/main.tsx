import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initMonitoring } from "./lib/monitoring";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
initMonitoring();
