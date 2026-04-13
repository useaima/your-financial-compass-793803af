# EVA

eva is a public web personal-finance copilot built around one reliable loop:

`log spending -> see it reflected everywhere -> get grounded advice -> take the next action`

The app is web-first on [eva.useaima.com](https://eva.useaima.com), uses Supabase for auth/data/functions, and keeps launch operations managed-first on Vercel + Supabase.

## Phase B focus

Phase B turns eva into a trustworthy public launch product by making the canonical workspace snapshot the source of truth for:

- dashboard summary
- spending history
- goals
- budgets
- subscriptions
- financial statements
- daily and weekly summaries
- actionable advice cards

Stock picks and finance news remain available, but they are secondary and must fail gracefully.

## Architecture

### Frontend

- Vite + React + TypeScript
- Route-protected authenticated workspace
- Chat-led product flow with structured companion views

### Backend

- Supabase Auth with email verification
- Supabase Postgres for canonical finance data
- Supabase Edge Functions for `finance-core`, chat, insights, statements, stock picks, and news
- Gemini-first orchestration through the shared EVA gateway

### Canonical workspace snapshot

`finance-core` returns the authenticated workspace state used across the app:

- `dashboard_summary`
- `advice`
- `summaries`
- `budget_statuses`
- `goal_statuses`
- `spending_logs`
- `financial_entries`
- `subscriptions`

## Local development

### Prerequisites

- Node.js 22+
- npm

### Required environment variables

Copy values into your shell or `.env` file:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

Recommended for richer AI and research features:

- `GROQ_API_KEY`
- `TAVILY_API_KEY`

### Commands

```bash
npm ci
npm run validate-env
npm run dev
```

Quality checks:

```bash
npm run build
npm run lint
npm run test
npm run ci
```

## Docker

eva includes a small multi-stage Docker build for reproducible web builds and local runtime parity.

Build:

```bash
npm run docker:build
```

Run:

```bash
npm run docker:run
```

The container serves the production build through nginx on port `8080`.

## CI

GitHub Actions runs the Phase B launch checks in [ci.yml](./.github/workflows/ci.yml):

- install dependencies
- validate environment
- build
- lint
- test

## Product principles

- personal finance first
- grounded advice over generic AI output
- trust before power
- chat first, structured views second
- managed infrastructure first, Kubernetes later

## Disclaimer

eva provides informational guidance and productized financial coaching. It does not provide legal, tax, or professional investment advice.
