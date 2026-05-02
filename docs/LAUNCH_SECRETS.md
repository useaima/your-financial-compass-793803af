# EVA Launch Secrets

Normal EVA chat uses Vercel AI Gateway. Direct Gemini grounding is Beta-only and should stay disabled by default for launch to protect free-tier quota.

## GitHub Actions secrets

Add these in GitHub repository settings under `Secrets and variables -> Actions`:

- `SUPABASE_ACCESS_TOKEN`: Supabase account access token for function deployment.
- `SUPABASE_PROJECT_ID`: Supabase project ref from `https://<project-ref>.supabase.co`.
- `EVA_AGENT_CYCLE_URL`: `https://<project-ref>.supabase.co/functions/v1/agent-cycle`.
- `EVA_AGENT_SCHEDULE_SECRET`: long random shared secret; use the same value in Supabase function secrets.

Optional for GitHub-side web builds:

- `VITE_SUPABASE_URL`: `https://<project-ref>.supabase.co`.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase anon/publishable key.

## Vercel environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Vercel git deployment should own production web hosting. Keep server-only AI and agent secrets in Supabase unless a Vercel server route explicitly needs them.

## Supabase Edge Function secrets

- `VERCEL_AI_GATEWAY_API_KEY`: primary AI key for normal EVA chat.
- `EVA_AGENT_SCHEDULE_SECRET`: same value as GitHub.
- `EVA_AGENT_AUTOPILOT_ENABLED=true`
- `EVA_GEMINI_GROUNDING_ENABLED=false`
- `EVA_GOOGLE_MAPS_ENABLED=false`
- `GEMINI_API_KEY`: optional, only for limited Beta Search/Maps grounding.

Do not add `GOOGLE_MAPS_API_KEY` for launch. EVA does not use a separate Places API key in the free-tier-safe path.

## Grounding policy

- Normal chat, affordability, summaries, budgets, subscriptions, and statements use Vercel AI Gateway.
- Direct Gemini `google_search` only runs for explicit Beta Search/current-price intents and has a client-side daily limit.
- Google Maps grounding is off by default; when disabled, EVA asks users to provide place/item/price details manually.
- EVA must not claim it searched Google or checked Maps unless grounded tool output was actually returned.
