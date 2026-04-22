# Architecture Overview

EVA is designed as a secure, cross-platform personal finance assistant. The system leverages a shared Supabase backend to power both a React-based web application and a Flutter-based mobile app, ensuring seamless data synchronization and consistent user experiences across devices.

## Core Philosophy

1.  **Single Source of Truth:** The Postgres database (via Supabase) acts as the canonical source for all financial records. State is derived from the backend and pushed to the clients.
2.  **Edge Execution:** Heavy AI computation and third-party API integrations (e.g., fetching news, generating stock picks, processing receipt images) run entirely in Supabase Edge Functions.
3.  **Cross-Platform Consistency:** Both `apps/web` and the mobile Flutter app consume identical API endpoints and adhere to the same schema (`BootstrapData`).

## System Components

### 1. Web Application (`apps/web`)
- **Framework:** React + Vite + TypeScript.
- **Styling:** Tailwind CSS with Shadcn UI components.
- **Routing:** `react-router-dom` for robust client-side routing.
- **Deployment:** Vercel.

### 2. Mobile Application (`C:\eva_flutter_app`)
- **Framework:** Flutter (Dart).
- **Architecture:** Riverpod for reactive state management.
- **Routing:** `go_router` for deep linking and navigation.
- **Integration:** Leverages `supabase_flutter` for auth and DB interactions.

### 3. Backend (Supabase)
- **Database:** PostgreSQL with strict Row-Level Security (RLS).
- **Auth:** Supabase Auth with Magic Links (Passwordless).
- **Edge Functions:**
  - `finance-core`: Bootstraps user data and aggregates metrics.
  - `generate-insights`: AI-powered financial coaching.
  - `fetch-finance-news`: Scrapes or retrieves live market updates.
  - `stock-recommendations`: Generates tailored stock picks.

## Data Flow

When a user opens either app:
1.  **Authentication:** The client checks for a valid session token.
2.  **Bootstrap:** The client listens to a central "Provider" (`PublicUserProvider` in React / `publicUserProvider` in Riverpod). This provider invokes the `finance-core` edge function to fetch the complete user state in one unified payload.
3.  **Real-Time Sync:** Any modifications (e.g., logging an expense) are sent to Supabase. The client then re-triggers the bootstrap function to pull the updated state.
