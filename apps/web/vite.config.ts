import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "node:fs";
import os from "node:os";
import path from "path";
import { componentTagger } from "lovable-tagger";

const buildTmpDir =
  [process.env.TMPDIR, process.env.TEMP, process.env.TMP, os.tmpdir(), "/tmp"].find(
    (dir): dir is string => Boolean(dir) && fs.existsSync(dir as string),
  ) ?? "/tmp";

process.env.TMPDIR = buildTmpDir;
process.env.TEMP = buildTmpDir;
process.env.TMP = buildTmpDir;

export default defineConfig(({ mode }) => ({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@tanstack/react-query")) {
              return "query";
            }

            if (id.includes("@supabase")) {
              return "supabase";
            }

            if (id.includes("recharts")) {
              return "charts";
            }

            if (id.includes("framer-motion")) {
              return "motion";
            }

            return "vendor";
          }
        },
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
