# EVA CI Triage Notes

## Web checks
- Validate env
- Build
- Lint
- Test

## Mobile checks
- Flutter pub get
- Analyze
- Format check
- Test
- Release APK build

## First response order
1. Confirm whether the job actually started
2. Check env and dependency setup
3. Reproduce locally with the same working directory
4. Separate repo/config failures from product-code failures
5. Only after that patch code

## Deploy follow-up
- Check Vercel production state for EVA web
- Check support site health
- Confirm Supabase-backed paths still have expected env vars and edge-function compatibility
