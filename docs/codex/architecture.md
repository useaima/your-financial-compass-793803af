# EVA Architecture Runbook

## Web
- `apps/web` is the live Supabase-backed product app
- `finance-core` is the canonical backend surface for workspace state and mutations
- Public flows: landing, auth, terms, privacy
- Protected flows: onboarding, dashboard, chat, transactions, goals, subscriptions, settings, statement, insights

## Mobile
- `apps/mobile` is still on Supabase parity work
- Keep mobile aligned to web contracts before adding mobile-only features

## Support
- `apps/support` is the static help center for `support.useaima.com`
- EVA should link directly to article paths, not just the support home page

## Backend
- Supabase remains production until Firebase Blaze is available
- Firebase cutover work stays isolated and must not be merged into the live path yet
