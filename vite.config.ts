import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
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
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false,
      },
      includeAssets: ["favicon.ico", "pwa-icon-192.png", "pwa-icon-512.png"],
      manifest: {
        name: "FinanceAI — Smart Financial Advisor",
        short_name: "FinanceAI",
        description: "AI-powered financial advisor that analyzes spending, predicts balances, and provides personalized financial advice.",
        theme_color: "#10b981",
        background_color: "#0a0a0b",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        id: "/",
        lang: "en",
        dir: "ltr",
        categories: ["finance", "productivity", "utilities"],
        icons: [
          {
            src: "pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "screenshot-wide.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "FinanceAI Dashboard",
          },
          {
            src: "screenshot-narrow.png",
            sizes: "750x1334",
            type: "image/png",
            form_factor: "narrow",
            label: "FinanceAI Mobile Dashboard",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            url: "/dashboard",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "AI Advisor",
            short_name: "Chat",
            url: "/chat",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Financial Statement",
            short_name: "Statement",
            url: "/financial-statement",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Insights",
            short_name: "Insights",
            url: "/insights",
            icons: [{ src: "pwa-icon-192.png", sizes: "192x192" }],
          },
        ],
        launch_handler: {
          client_mode: "navigate-existing",
        },
        handle_links: "preferred",
        share_target: {
          action: "/dashboard",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
        edge_side_panel: {
          preferred_width: 400,
        },
        protocol_handlers: [
          {
            protocol: "web+financeai",
            url: "/dashboard?action=%s",
          },
        ],
      } as any,
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
