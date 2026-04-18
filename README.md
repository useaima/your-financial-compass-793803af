# EVA

EVA is a personal-finance copilot with a shared Supabase backend, a public web app, a Flutter mobile app, and a separate support center for end-user help.

The product core stays the same across platforms:

`log spending -> see it reflected everywhere -> get grounded advice -> take the next action`

## Monorepo layout

```text
eva/
├── apps/
│   ├── web/        # Vite + React web app
│   ├── mobile/     # Flutter mobile app
│   └── support/    # static help-center source package
├── supabase/       # shared auth, database, migrations, edge functions
├── docker/         # container/runtime helpers
└── .github/        # CI/CD workflows
```

## Phase status

### Phase A / B foundation

The web app already includes:

- authenticated signup, signin, and email verification
- onboarding and workspace bootstrap through `finance-core`
- chat-led spending capture
- grounded dashboard, budgets, goals, subscriptions, and statements
- mobile/desktop navigation shell and profile menus

### Phase C / D rollout

The current rollout extends the same canonical `finance-core` into:

- spending pattern summaries
- month-end cash and spending forecast
- affordability checks
- grounded subscription review
- CSV transaction import into a draft review queue
- forwarded receipt ingestion into the same review flow
- scheduled daily and weekly summary notifications
- direct help-center links to `support.useaima.com`

## Web app

The web app lives in `apps/web/`.

### Local development

```bash
cd apps/web
npm ci
npm run validate-env
npm run dev
```

### Quality checks

```bash
cd apps/web
npm run build
npm run lint
npm run test
npm run ci
```

### Required environment variables

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

Recommended for richer AI/research behavior:

- `GROQ_API_KEY`
- `TAVILY_API_KEY`

Additional server-side secrets for the Phase C/D rollout:

- `EVA_RECEIPT_INGEST_SECRET`
- `EVA_SCHEDULED_SUMMARIES_SECRET`

## Mobile app

The Flutter mobile app lives in `apps/mobile/` and shares the same Supabase backend.

Typical setup:

```bash
cd apps/mobile
flutter pub get
flutter run
```

## Support center

`apps/support/` is the static help-center source package for the separate `aima-support` repo and deployment at `support.useaima.com`.

It includes:

- article-driven help content in `data.json`
- client-side article routing for `/articles/<article-id>`
- static Vercel rewrite support via `vercel.json`

## Backend

Both apps connect to the shared Supabase backend in `supabase/`.

Key edge functions:

- `finance-core`
- `chat`
- `generate-insights`
- `generate-statement`
- `receipt-ingress`
- `scheduled-summaries`

Shared data stays canonical in Postgres and is exposed through the authenticated workspace bootstrap rather than page-specific truth.

## CI/CD

GitHub Actions covers:

- web build/lint/test
- Flutter mobile checks and builds
- deployment workflows tied to the org repo

The web app deploys through Vercel from the monorepo, and the support center is intended to deploy through the existing `aima-support` Vercel project.

## Product principles

- personal finance first
- grounded advice over generic AI output
- trust before power
- chat first, structured views second
- managed infrastructure first, Kubernetes later

## Disclaimer

EVA provides informational financial guidance and coaching-style product assistance. It does not provide legal, tax, or professional investment advice.
Manual deployment:
```bash
cd apps/web
npm run build
```

### Mobile App
Build release artifacts:
```bash
cd apps/mobile

# Android
flutter build apk --release
flutter build appbundle --release

# iOS
flutter build ios --release
```

## Monitoring & Logs

- **Sentry**: Error tracking for web app
- **Supabase Logs**: Function execution logs
- **GitHub Actions**: CI/CD pipeline logs

## Contributing

1. Create a feature branch (`git checkout -b feature/your-feature`)
2. Make changes in `apps/web` or `apps/mobile`
3. Run tests and lint checks
4. Commit with clear messages
5. Push and create a Pull Request

## Product Principles

- **Personal Finance First**: Focus on user's financial health
- **Grounded Advice**: Data-driven over generic AI
- **Trust Before Power**: Security and privacy paramount
- **Chat First, Structured Views Second**: Conversational interface primary
- **Managed Infrastructure**: Leverage managed services (Supabase, Vercel)

## License

See [LICENSE](LICENSE) file for details.

## Disclaimer

EVA provides informational guidance and financial coaching. It does not provide legal, tax, or professional investment advice. Always consult with qualified professionals before making financial decisions.

## Support

For issues, feature requests, or questions:
- **Web App**: See [apps/web/README.md](apps/web/README.md)
- **Mobile App**: See [apps/mobile/MOBILE_README.md](apps/mobile/MOBILE_README.md)
- **GitHub Issues**: [Report an issue](https://github.com/useaima/your-financial-compass-793803af/issues)

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Flutter Docs](https://flutter.dev/docs)
- [Vite Docs](https://vitejs.dev)
- [Riverpod Docs](https://riverpod.dev)

---

**EVA** - Your Personal Finance Compass 🧭💰
